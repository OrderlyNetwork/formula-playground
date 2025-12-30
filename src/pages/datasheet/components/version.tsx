import { useState } from "react";
import { useAppStore } from "../../../store/appStore";
import { VersionSelector } from "../../../components/VersionSelector";

/**
 * Version component - Displays current formula adapter information
 * Shows the adapter name and version used for formula execution
 * Clicking on the version opens a dialog to switch versions
 */
export const Version = () => {
  const { adapterName, adapterVersion } = useAppStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div
        className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        onClick={() => setIsDialogOpen(true)}
        title="Click to switch version"
      >
        <span>SDK:</span>
        {adapterName && adapterVersion ? (
          <span className="underline decoration-dotted">
            {adapterName}{" "}
            <span className="text-gray-500">v{adapterVersion}</span>
          </span>
        ) : (
          <span className="text-gray-400 italic">Not initialized</span>
        )}
      </div>
      <VersionSelector open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
};
