/**
 * 全局系统对话框服务使用指南
 * 
 * 本服务已集成到应用的根布局中，可以在任何组件中使用。
 */

import { useSystemDialog } from '@/lib/SystemDialogContext';

export function ExampleComponent() {
  const { showSuccess, showError, showWarning, showInfo, showConfirm } = useSystemDialog();

  const handleSuccess = () => {
    showSuccess('操作成功', '您的操作已成功完成！');
  };

  const handleError = () => {
    showError('操作失败', '抱歉，操作失败，请重试。');
  };

  const handleWarning = () => {
    showWarning('警告', '这是一个警告信息。');
  };

  const handleInfo = () => {
    showInfo('提示', '这是一个信息提示。');
  };

  const handleConfirm = () => {
    showConfirm(
      '确认操作',
      '您确定要执行此操作吗？',
      () => {
        console.log('用户点击了确认');
        showSuccess('已确认', '操作已执行');
      },
      () => {
        console.log('用户点击了取消');
      }
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">系统对话框示例</h2>
      <div className="space-x-2">
        <button
          onClick={handleSuccess}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          成功提示
        </button>
        <button
          onClick={handleError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          错误提示
        </button>
        <button
          onClick={handleWarning}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          警告提示
        </button>
        <button
          onClick={handleInfo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          信息提示
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          确认对话框
        </button>
      </div>
    </div>
  );
}

/**
 * 在任何组件中使用全局对话框的方法：
 * 
 * 1. 导入 hook：
 *    import { useSystemDialog } from '@/lib/SystemDialogContext';
 * 
 * 2. 在组件中使用：
 *    const { showSuccess, showError, showWarning, showInfo, showConfirm } = useSystemDialog();
 * 
 * 3. 调用相应方法：
 *    showSuccess('标题', '消息内容');
 *    showError('错误', '错误信息');
 *    showWarning('警告', '警告信息');
 *    showInfo('信息', '信息内容');
 *    showConfirm('确认', '确认信息', onConfirm, onCancel);
 * 
 * 4. 高级用法（自定义对话框）：
 *    const { showDialog } = useSystemDialog();
 *    showDialog({
 *      title: '自定义标题',
 *      message: '自定义消息',
 *      type: 'warning',
 *      confirmText: '确定',
 *      cancelText: '取消',
 *      showCancel: true,
 *      onConfirm: () => { /* 确认回调 * / },
 *      onCancel: () => { /* 取消回调 * / }
 *    });
 */