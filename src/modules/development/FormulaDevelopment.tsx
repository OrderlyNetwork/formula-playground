import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { CodeInput } from "@/pages/playground/components/CodeInput";


export const FormulaDevelopment = () => {
  return (
    <ResizablePanelGroup direction="vertical" className="flex-1">
      <ResizablePanel defaultSize={70} minSize={20}>
        <CodeInput />
      </ResizablePanel>

      <ResizableHandle className="bg-zinc-200" />

      <ResizablePanel defaultSize={30} minSize={10}>
        <div>Runner</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
