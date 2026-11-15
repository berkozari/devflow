#!/usr/bin/env node
/**
 * DevFlow Dashboard API latency benchmark (Node.js >= 20; no dependencies).
 * Intended for local or staging environments, not uncontrolled production load.
 * Does not log/store bearer tokens or response bodies.
 */
import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const allEndpoints = {
    overview: { path: '/dashboard/overview', ttlSeconds: 60 },
    overdue: { path: '/dashboard/overdue-tasks', ttlSeconds: 60 },
    workload: { path: '/dashboard/workload', ttlSeconds: 120 },
    activities: { path: '/dashboard/activities', ttlSeconds: 30 },
};

function readInt(name, defaultValue, min, max) {
    const value = process.env[name] ?? String(defaultValue);
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw new Error(`${name} must be an integer between ${min} and ${max}`);
    }
    return parsed;
}

function getSettings() {
    const token = process.env.BENCH_TOKEN;
    if (!token) throw new Error('BENCH_TOKEN is required (JWT access token).');

    const baseUrl = (process.env.BENCH_BASE_URL ?? 'http://127.0.0.1:3000/api/v1').replace(/\/+$/, '');
    const selected = (process.env.BENCH_ENDPOINTS ?? Object.keys(allEndpoints).join(','))
        .split(',').map(x => x.trim()).filter(Boolean);
    if (selected.length === 0 || selected.some(x => !(x in allEndpoints))) {
        throw new Error(`BENCH_ENDPOINTS must contain: ${Object.keys(allEndpoints).join(', ')}`);
    }

    const urlParams = new URLSearchParams();
    for (const [envVar, queryName] of [
        ['BENCH_PROJECT_ID', 'projectId'],
        ['BENCH_START_DATE', 'startDate'],
        ['BENCH_END_DATE', 'endDate'],
    ]) {
        if (process.env[envVar]) urlParams.set(queryName, process.env[envVar]);
    }

    const base = new URL(baseUrl + '/');
    if (!['http:', 'https:'].includes(base.protocol)) throw new Error('BENCH_BASE_URL must be HTTP(S).');
    if (base.username || base.password || base.search || base.hash) {
        throw new Error('BENCH_BASE_URL must not contain credentials, query, or fragment.');
    }

    return {
        token,
        baseUrl,
        selected: [...new Set(selected)],
        params: urlParams,
        requests: readInt('BENCH_REQUESTS', 10, 1, 1000),
        concurrency: readInt('BENCH_CONCURRENCY', 2, 1, 20),
        timeoutMs: readInt('BENCH_TIMEOUT_MS', 15000, 100, 120000),
        cold: process.env.BENCH_COLD === '1',
        output: process.env.BENCH_OUTPUT ?? `reports/dashboard-benchmark-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    };
}

function endpointUrl(config, name) {
    const url = new URL(config.baseUrl + allEndpoints[name].path);
    config.params.forEach((value, key) => url.searchParams.set(key, value));
    return url;
}

async function requestOnce(url, config) {
    const start = performance.now();
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${config.token}`,
                Accept: 'application/json',
            },
            signal: AbortSignal.timeout(config.timeoutMs),
        });
        // Include transfer/body consumption time, not only response headers.
        const responseBody = await response.arrayBuffer();
        return {
            status: response.status,
            ms: performance.now() - start,
            bytes: responseBody.byteLength,
        };
    } catch (error) {
        return {
            status: 'NETWORK_ERROR',
            ms: performance.now() - start,
            errorType: error instanceof Error ? error.name : 'UnknownError',
        };
    }
}

function percentile(sorted, percentileValue) {
    if (sorted.length === 0) return null;
    const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function summarize(samples, wallMs) {
    const success = samples.filter(item => item.status === 200).map(item => item.ms).sort((a, b) => a - b);
    const statusCounts = {};
    for (const sample of samples) {
        statusCounts[sample.status] = (statusCounts[sample.status] ?? 0) + 1;
    }
    const round = value => value == null ? null : Number(value.toFixed(2));
    return {
        attempted: samples.length,
        statusCounts,
        wallMs: round(wallMs),
        successRps: round(success.length / (wallMs / 1000)),
        minMs: round(success[0] ?? null),
        meanMs: round(success.length ? success.reduce((a, b) => a + b, 0) / success.length : null),
        p50Ms: round(percentile(success, 50)),
        p95Ms: round(percentile(success, 95)),
        maxMs: round(success.at(-1) ?? null),
    };
}

async function runBatch(url, config) {
    let next = 0;
    let abort = false;
    const samples = [];
    const startedAt = performance.now();

    await Promise.all(Array.from({ length: Math.min(config.concurrency, config.requests) }, async () => {
        while (!abort && next < config.requests) {
            next += 1;
            const sample = await requestOnce(url, config);
            samples.push(sample);
            if (sample.status === 429 || sample.status === 401 || sample.status === 403 || sample.status === 'NETWORK_ERROR') {
                abort = true;
            }
        }
    }));
    return { summary: summarize(samples, performance.now() - startedAt), stoppedEarly: abort };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    const config = getSettings();
    const meta = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        baseUrl: config.baseUrl,
        endpoints: config.selected,
        query: Object.fromEntries(config.params),
        requestsPerEndpoint: config.requests,
        concurrency: config.concurrency,
        coldMode: config.cold,
        coldAssumption: 'No other client requests the same cache keys during TTL wait',
    };

    console.log('DevFlow Dashboard benchmark — local/staging only');
    console.log(`URL: ${config.baseUrl} | endpoints: ${config.selected.join(', ')} | requests/endpoint: ${config.requests} | concurrency: ${config.concurrency}`);
    console.log('JWT and HTTP response bodies are never printed or written to reports.');

    const coldSamples = {};
    if (config.cold) {
        console.log('Preparing cold samples: populating cache keys first...');
        for (const name of config.selected) {
            const warmup = await requestOnce(endpointUrl(config, name), config);
            if (warmup.status !== 200) {
                throw new Error(`${name} warmup returned ${warmup.status}; aborting (check token, server, rate limits).`);
            }
        }
        const waitSeconds = Math.max(...config.selected.map(name => allEndpoints[name].ttlSeconds)) + 3;
        console.log(`Waiting ${waitSeconds}s for configured cache TTLs to expire (do not send concurrent dashboard requests)...`);
        await sleep(waitSeconds * 1000);
        for (const name of config.selected) {
            const sample = await requestOnce(endpointUrl(config, name), config);
            if (sample.status !== 200) {
                throw new Error(`${name} cold sample returned ${sample.status}; aborting.`);
            }
            coldSamples[name] = Number(sample.ms.toFixed(2));
            console.log(`  ${name}: single post-TTL request = ${coldSamples[name]} ms`);
        }
        console.log('Cold measurements are single samples, not p95 figures.');
    }

    const measurements = [];
    for (const name of config.selected) {
        const url = endpointUrl(config, name);
        if (!config.cold) {
            const warmup = await requestOnce(url, config);
            if (warmup.status !== 200) {
                throw new Error(`${name} warmup returned ${warmup.status}; aborting (check token, rate limits and API).`);
            }
        }
        const batch = await runBatch(url, config);
        const row = { endpoint: name, coldSingleMs: coldSamples[name] ?? null, ...batch.summary };
        measurements.push(row);
        console.log(`${name}: p50=${row.p50Ms ?? '-'}ms, p95=${row.p95Ms ?? '-'}ms, mean=${row.meanMs ?? '-'}ms, status=${JSON.stringify(row.statusCounts)}`);
        if (batch.stoppedEarly) {
            console.warn('Stopped after 429 / 401 / 403 / network error. Adjust rate limit budget or credentials.');
            break;
        }
    }

    const report = { meta, measurements };
    const outputFile = resolve(config.output);
    mkdirSync(dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    console.log(`Report saved to ${outputFile}`);
    if (measurements.some(row => Object.keys(row.statusCounts).some(key => key !== '200'))) {
        process.exitCode = 2;
    }
}

run().catch(error => {
    console.error(`Benchmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exitCode = 1;
});
