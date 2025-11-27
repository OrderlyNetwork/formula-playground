export interface Table {
  name: string;
  type: "table" | "view";
  pinned?: boolean;
  active?: boolean;
}

export interface QueryResult {
  id: number;
  title: string;
  description: string;
}

export interface TabItem {
  id: string;
  label: string;
  type: "code" | "grid";
  active?: boolean;
  isLoading?: boolean;
  isDirty?: boolean;
}
