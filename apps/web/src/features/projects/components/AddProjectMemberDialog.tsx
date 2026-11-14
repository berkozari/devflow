
import { useState, type FormEvent } from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AddProjectMemberPayload } from "../types/project-member.types";

interface AddProjectMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: AddProjectMemberPayload) => void;
    isPending: boolean;
    canAssignAdmin: boolean;
}

export function AddProjectMemberDialog({
    open,
    onOpenChange,
    onSubmit,
    isPending,
    canAssignAdmin,
}: AddProjectMemberDialogProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
    const [error, setError] = useState("");

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setError("Email is required.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setError("Enter a valid email address.");
            return;
        }

        setError("");

        onSubmit({
            email: normalizedEmail,
            role: canAssignAdmin ? role : "MEMBER",
        });
    };

    const handleOpenChange = (value: boolean) => {
        if (!value && !isPending) {
            setEmail("");
            setRole("MEMBER");
            setError("");
        }

        onOpenChange(value);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add project member</DialogTitle>

                        <DialogDescription>
                            Invite an existing DevFlow user to collaborate
                            on this project.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-5">
                        <div className="space-y-2">
                            <Label htmlFor="member-email">
                                Email address
                            </Label>

                            <Input
                                id="member-email"
                                type="email"
                                placeholder="user@example.com"
                                value={email}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    setError("");
                                }}
                                disabled={isPending}
                            />

                            {error && (
                                <p className="text-sm text-destructive">
                                    {error}
                                </p>
                            )}
                        </div>

                        {canAssignAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="member-role">
                                    Project role
                                </Label>

                                <select
                                    id="member-role"
                                    value={role}
                                    onChange={(event) =>
                                        setRole(
                                            event.target.value as
                                            "ADMIN" | "MEMBER",
                                        )
                                    }
                                    disabled={isPending}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="MEMBER">
                                        Member
                                    </option>

                                    <option value="ADMIN">
                                        Admin
                                    </option>
                                </select>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>

                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Adding..." : "Add member"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
