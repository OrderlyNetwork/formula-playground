import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FormulaTab {
  id: string; // 公式 ID
  label: string; // 显示的标签名称
  type: "code" | "grid"; // 标签类型
  isDirty?: boolean; // 是否有未保存的修改
}

interface FormulaTabState {
  // 打开的标签页列表
  tabs: FormulaTab[];

  // 当前活动的标签页 ID
  activeTabId: string | null;

  // 添加新标签页
  addTab: (
    formulaId: string,
    formulaName: string,
    type?: "code" | "grid"
  ) => void;

  // 关闭标签页
  closeTab: (formulaId: string) => void;

  // 切换活动标签页
  setActiveTab: (formulaId: string) => void;

  // 更新标签页信息
  updateTab: (formulaId: string, updates: Partial<FormulaTab>) => void;

  // 关闭所有标签页
  closeAllTabs: () => void;

  // 关闭其他标签页
  closeOtherTabs: (formulaId: string) => void;

  // 检查标签页是否已打开
  isTabOpen: (formulaId: string) => boolean;

  // 获取活动标签页
  getActiveTab: () => FormulaTab | null;
}

export const useFormulaTabStore = create<FormulaTabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (
        formulaId: string,
        formulaName: string,
        type = "code" as const
      ) => {
        const { tabs, isTabOpen } = get();

        // 如果标签页已存在,只需激活它
        if (isTabOpen(formulaId)) {
          set({ activeTabId: formulaId });
          return;
        }

        // 创建新标签页
        const newTab: FormulaTab = {
          id: formulaId,
          label: formulaName,
          type,
          isDirty: false,
        };

        set({
          tabs: [...tabs, newTab],
          activeTabId: formulaId,
        });
      },

      closeTab: (formulaId: string) => {
        const { tabs, activeTabId } = get();
        const tabIndex = tabs.findIndex((tab) => tab.id === formulaId);

        if (tabIndex === -1) return;

        const newTabs = tabs.filter((tab) => tab.id !== formulaId);

        // 如果关闭的是活动标签页,需要激活另一个标签页
        let newActiveTabId = activeTabId;
        if (activeTabId === formulaId) {
          if (newTabs.length === 0) {
            newActiveTabId = null;
          } else if (tabIndex < newTabs.length) {
            // 激活右侧的标签页
            newActiveTabId = newTabs[tabIndex].id;
          } else {
            // 激活左侧的标签页
            newActiveTabId = newTabs[tabIndex - 1].id;
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        });
      },

      setActiveTab: (formulaId: string) => {
        const { isTabOpen } = get();

        if (isTabOpen(formulaId)) {
          set({ activeTabId: formulaId });
        }
      },

      updateTab: (formulaId: string, updates: Partial<FormulaTab>) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === formulaId ? { ...tab, ...updates } : tab
          ),
        }));
      },

      closeAllTabs: () => {
        set({
          tabs: [],
          activeTabId: null,
        });
      },

      closeOtherTabs: (formulaId: string) => {
        const { tabs } = get();
        const targetTab = tabs.find((tab) => tab.id === formulaId);

        if (targetTab) {
          set({
            tabs: [targetTab],
            activeTabId: formulaId,
          });
        }
      },

      isTabOpen: (formulaId: string) => {
        return get().tabs.some((tab) => tab.id === formulaId);
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find((tab) => tab.id === activeTabId) || null;
      },
    }),
    {
      name: "formula-tab-storage", // 持久化存储的键名
      partialize: (state) => ({
        // 只持久化标签页列表和活动标签ID
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
