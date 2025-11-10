# WebSocket Node Subscription Fix Summary

## 修复前的问题

1. **useEffect依赖冲突**: `resolvedTopic` 和 `isTopicReady` 在依赖数组中，但它们依赖于 `placeholderValues`，导致反复订阅/退订
2. **重复的订阅逻辑**: 两个useEffect处理订阅，造成竞态条件
3. **重复的cleanup**: unmount时有多个cleanup逻辑导致重复退订调用

## 修复措施

### 1. 简化useEffect依赖
```typescript
// 修复前：依赖频繁变化的值
}, [webSocketBaseURL, topicTemplate, resolvedTopic, isTopicReady, id, ...]);

// 修复后：只依赖核心稳定值
}, [webSocketBaseURL, topicTemplate, id, updateNodeData, placeholders.length, ...]);
// 并添加 eslint-disable-next-line react-hooks/exhaustive-deps
```

### 2. 合并订阅逻辑
- 将 `createSubscription` 函数逻辑直接移入主 useEffect
- 移除重复的useCallback
- 简化参数变化检测逻辑

### 3. 优化cleanup逻辑
```typescript
// 修复前：重复cleanup
useEffect(() => {
  return () => {
    // 复杂的cleanup逻辑
  };
}, [id]);

// 修复后：简单cleanup
useEffect(() => {
  return () => {
    websocketManager.removeNode(id); // 委托给manager处理
    unsubscribeRef.current = null;
    currentSubscriptionRef.current = null;
  };
}, [id]);
```

## 修复效果

1. **减少重复订阅**: 只在topic真正改变时才重新订阅
2. **稳定的依赖**: useEffect不再因参数变化而频繁触发
3. **清晰的逻辑**: 订阅/退订逻辑更加简洁易懂
4. **正确的cleanup**: 避免重复调用退订函数

## 测试建议

1. 创建WebSocket节点并设置参数化topic (如 `{symbol}@indexprice`)
2. 修改symbol参数，观察是否只触发一次重新订阅
3. 检查控制台日志，确认没有重复的订阅/退订消息
4. 验证数据流是否正常工作