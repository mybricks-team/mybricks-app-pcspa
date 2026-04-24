import React, { useState } from 'react';
import { Button, Form, Input, Modal, Table, Popconfirm, Typography, message, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { TConfigProps } from '../useConfig';

type LibraryItem = {
  name: string;
  version: string;
  usage?: string;
  assets?: string[];
};

const LibraryModal = ({
  visible,
  status,
  library,
  onOk,
  onCancel,
}: {
  visible: boolean;
  status: 'add' | 'edit';
  library: LibraryItem | null;
  onOk: (values: LibraryItem) => void;
  onCancel: () => void;
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        name: library?.name || '',
        version: library?.version || '',
        usage: library?.usage || '',
        assets: (library?.assets || []).join('\n'),
      });
    }
    return () => form.resetFields();
  }, [visible, library]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onOk({
        ...values,
        assets: values.assets ? values.assets.split('\n').filter((s: string) => s.trim()) : [],
      });
    });
  };

  return (
    <Modal
      visible={visible}
      title={status === 'add' ? '新增组件库' : '编辑组件库'}
      okText="保存"
      cancelText="取消"
      onOk={handleOk}
      onCancel={onCancel}
      maskClosable={false}
      width={600}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
        <Form.Item
          label="名称"
          name="name"
          rules={[{ required: true, message: '请填写名称' }]}
        >
          <Input allowClear />
        </Form.Item>
        <Form.Item
          label="版本"
          name="version"
          rules={[{ required: true, message: '请填写版本' }]}
        >
          <Input allowClear />
        </Form.Item>
        <Form.Item label="使用说明" name="usage">
          <Input.TextArea rows={4} allowClear placeholder="输入对租价哭的使用说明（Markdown）" />
        </Form.Item>
        <Form.Item label="资源地址" name="assets" extra="多个链接地址换行分隔">
          <Input.TextArea rows={4} allowClear placeholder={'每行一个链接，例如：\nhttps://xxx.com/lib.umd.js\nhttps://xxx.com/lib.css'} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default (props: TConfigProps) => {
  const { config, mergeUpdateConfig } = props;

  const aiConfig = config?.ai || {};

  const DEFAULT_LIBRARIES: LibraryItem[] = [
    {
      name: 'antd',
      version: '4.23.6',
      assets: [
        'https://unpkg.com/antd@4.23.6/dist/antd.min.js',
        'https://unpkg.com/antd@4.23.6/dist/antd.min.css',
      ],
    },
    {
      name: '@ant-design/icons',
      version: '4.7.0',
      assets: [
        'https://unpkg.com/@ant-design/icons@4.7.0/dist/index.umd.min.js',
      ],
    },
    {
      name: 'dayjs',
      version: '1.11.3',
      assets: [
        'https://unpkg.com/dayjs@1.11.3/dayjs.min.js',
      ],
    },
  ];

  const [libraries, setLibraries] = useState<LibraryItem[]>((aiConfig.availableLibraries?.length > 0) ? aiConfig.availableLibraries : DEFAULT_LIBRARIES);
  const [codeRules, setCodeRules] = useState<string>(aiConfig.codeRules || '');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStatus, setModalStatus] = useState<'add' | 'edit'>('add');
  const [currentLibrary, setCurrentLibrary] = useState<LibraryItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  React.useEffect(() => {
    setLibraries((aiConfig.availableLibraries?.length > 0) ? aiConfig.availableLibraries : DEFAULT_LIBRARIES);
    setCodeRules(aiConfig.codeRules || '');
  }, [config]);

  const saveLibraries = () => {
    mergeUpdateConfig({ ai: { ...aiConfig, availableLibraries: libraries } });
    message.success('保存成功');
  };

  const saveCodeRules = () => {
    mergeUpdateConfig({ ai: { ...aiConfig, codeRules } });
    message.success('保存成功');
  };

  const onAdd = () => {
    setCurrentLibrary(null);
    setCurrentIndex(-1);
    setModalStatus('add');
    setModalVisible(true);
  };

  const onEdit = (item: LibraryItem, index: number) => {
    setCurrentLibrary(item);
    setCurrentIndex(index);
    setModalStatus('edit');
    setModalVisible(true);
  };

  const onDelete = (index: number) => {
    const newList = [...libraries];
    newList.splice(index, 1);
    setLibraries(newList);
  };

  const onMoveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...libraries];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    setLibraries(newList);
  };

  const onMoveDown = (index: number) => {
    if (index === libraries.length - 1) return;
    const newList = [...libraries];
    [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
    setLibraries(newList);
  };

  const onModalOk = (values: LibraryItem) => {
    const newList = [...libraries];
    if (modalStatus === 'add') {
      newList.push(values);
    } else {
      newList.splice(currentIndex, 1, values);
    }
    setLibraries(newList);
    setModalVisible(false);
    message.success(modalStatus === 'add' ? '添加成功' : '更新成功');
  };

  const columns = [
    {
      title: '包名',
      dataIndex: 'name',
      key: 'name',
      width: 140,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: 'UMD 链接',
      dataIndex: 'assets',
      key: 'assets',
      render: (assets: string[]) => (
        <div>
          {(assets || []).map((url, i) => (
            <div key={i} style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {url}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: LibraryItem, index: number) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => onMoveUp(index)} disabled={index === 0}>上移</Button>
          <Button type="link" size="small" onClick={() => onMoveDown(index)} disabled={index === libraries.length - 1}>下移</Button>
          <Button type="link" size="small" onClick={() => onEdit(record, index)}>编辑</Button>
          <Popconfirm
            title={`确定删除 ${record.name} 吗？`}
            onConfirm={() => onDelete(index)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 资产配置 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <Typography.Title level={5} style={{ marginBottom: 2 }}>资产配置</Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>管理空间内可用的组件库，生成代码时将自动引用对应 UMD 资源</Typography.Text>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Typography.Text>可用组件库</Typography.Text>
          <Space>
            <Button onClick={onAdd} icon={<PlusOutlined />}>新增组件库</Button>
            <Button type="primary" onClick={saveLibraries}>保存配置</Button>
          </Space>
        </div>
        <Table
          dataSource={libraries}
          columns={columns}
          rowKey={(_, index) => String(index)}
          pagination={false}
          size="small"
          bordered
        />
      </div>

      {/* 代码规则 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Typography.Title level={5} style={{ marginBottom: 2 }}>代码规则</Typography.Title>
          <Button type="primary" onClick={saveCodeRules}>保存配置</Button>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          用 Markdown 描述代码规范，生成代码时将作为规则参考
        </Typography.Text>
        <Input.TextArea
          rows={14}
          value={codeRules}
          onChange={(e) => setCodeRules(e.target.value)}
          placeholder="用 Markdown 描述代码规范..."
        />
      </div>

      <LibraryModal
        visible={modalVisible}
        status={modalStatus}
        library={currentLibrary}
        onOk={onModalOk}
        onCancel={() => setModalVisible(false)}
      />
    </div>
  );
};
