import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export type ConflictResolution = "merge" | "replace-url" | "replace-db" | "cancel";

interface DataConflictDialogProps {
  open: boolean;
  onResolve: (resolution: ConflictResolution) => void;
  urlDataCount: number;
  dbDataCount: number;
}

/**
 * Dialog for resolving conflicts between URL data and IndexedDB data
 * Shows when both sources have data for the same formula
 */
export const DataConflictDialog: React.FC<DataConflictDialogProps> = ({
  open,
  onResolve,
  urlDataCount,
  dbDataCount,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onResolve("cancel")}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Data Conflict Detected</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            This formula has data from both the URL ({urlDataCount} cells) and
            your saved session ({dbDataCount} cells). How would you like to proceed?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Button
            variant="default"
            onClick={() => onResolve("replace-url")}
            className="justify-start h-auto py-3 px-4"
          >
            <div className="text-left">
              <div className="font-semibold">Use URL Data</div>
              <div className="text-xs text-muted-foreground mt-1">
                Replace your saved data with data from the URL
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => onResolve("replace-db")}
            className="justify-start h-auto py-3 px-4"
          >
            <div className="text-left">
              <div className="font-semibold">Use Saved Data</div>
              <div className="text-xs text-muted-foreground mt-1">
                Keep your saved data and ignore the URL data
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => onResolve("merge")}
            className="justify-start h-auto py-3 px-4"
          >
            <div className="text-left">
              <div className="font-semibold">Merge Data</div>
              <div className="text-xs text-muted-foreground mt-1">
                Combine both sources (URL data takes priority for conflicts)
              </div>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onResolve("cancel")}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
