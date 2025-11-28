import { useAppStore } from "../../../store/appStore";

/**
 * Version component - Displays current formula adapter information
 * Shows the adapter name and version used for formula execution
 */
export const Version = () => {
  const { adapterName, adapterVersion } = useAppStore();

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
      <span>SDK:</span>
      {adapterName && adapterVersion ? (
        <span>
          {adapterName} <span className="text-gray-500">v{adapterVersion}</span>
        </span>
      ) : (
        <span className="text-gray-400 italic">Not initialized</span>
      )}
    </div>
  );
};
