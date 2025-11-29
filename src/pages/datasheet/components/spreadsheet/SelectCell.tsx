import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ColumnDef } from "@/types/spreadsheet";

export interface SelectCellProps {
    rowId: string;
    column: ColumnDef;
    onCellClick?: (rowId: string, colId: string) => void;
    options: {
        value: string;
        label: string;
    }[];
}
export const SelectCell = ({ rowId, column, onCellClick }: SelectCellProps) => {
    return <div><Select >
        <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
            <SelectGroup>
                <SelectLabel>Fruits</SelectLabel>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
                <SelectItem value="blueberry">Blueberry</SelectItem>
                <SelectItem value="grapes">Grapes</SelectItem>
                <SelectItem value="pineapple">Pineapple</SelectItem>
            </SelectGroup>
        </SelectContent>
    </Select></div>;
};