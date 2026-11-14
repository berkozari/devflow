
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

interface RemoveProjectMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    memberName: string;
    onConfirm: () => void;
    isPending: boolean;
}

export function RemoveProjectMemberDialog({
    open,
    onOpenChange,
    memberName,
    onConfirm,
    isPending,
}: RemoveProjectMemberDialogProps) {
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!isPending) {
                    onOpenChange(value);
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Remove project member?</DialogTitle>

                    <DialogDescription>
                        Are you sure you want to remove{" "}
                        <strong>{memberName}</strong> from this project?
                        They will lose access to project resources.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        disabled={isPending}
                        onClick={onConfirm}
                    >
                        {isPending ? "Removing..." : "Remove member"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
