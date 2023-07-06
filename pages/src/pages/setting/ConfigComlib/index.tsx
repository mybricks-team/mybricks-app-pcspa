import React, { useEffect, useRef, useState } from "react";
import {Card, Avatar, Modal, Space, message, Input} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import AppendModal, { ComLibType } from "./Modal";
import API from "@mybricks/sdk-for-app/api";
import { _NAMESPACE_ } from "../app";
import dayjs from "dayjs";
import styles from "./index.less";

const { Meta } = Card;
export default ({ user }) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [status, setStatus] = useState<"edit" | "append">();
  const [comlibs, setComlibs] = useState<ComLibType[]>();
  const [designer, setDesigner] = useState<string>('');
  const [currentComlib, setCurrentComlib] = useState<ComLibType>();
  const configRef = useRef({});
  useEffect(() => {
    API.Setting.getSetting([_NAMESPACE_]).then((res) => {
      configRef.current = res[_NAMESPACE_]?.config ?? {};
      setComlibs(res[_NAMESPACE_]?.config?.comlibs ?? []);
	    setDesigner(res[_NAMESPACE_]?.config?.designer ?? '');
    });
  }, []);
  const onOk = async (values) => {
    setVisible(false);
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    if (status === "edit") {
      const index = comlibs.findIndex(
        ({ namespace }) => namespace === values.namespace
      );
      comlibs.splice(index, 1, {
        ...values,
        user,
        updateTime,
      });
    } else if (status === "append") {
      if (comlibs.find((lib) => lib.namespace === values.namespace)) {
        message.info("组件库已存在");
        return;
      }
      comlibs.push({
        ...values,
        user,
        updateTime,
      });
    }
    await saveConfig({ ...configRef.current, comlibs });
    setComlibs([...comlibs]);
    message.success(status === "edit" ? "更新成功" : "添加成功");
  };
  const onCancel = () => {
    setVisible(false);
  };

  const onAdd = () => {
    setCurrentComlib(undefined);
    setStatus("append");
    setVisible(true);
  };

  const onEdit = (comlib: ComLibType) => {
    setCurrentComlib(comlib);
    setStatus("edit");
    setVisible(true);
  };

  const onDelete = (comlib) => {
    Modal.confirm({
      title: "确定删除组件库？",
      cancelText: "再想想",
      okText: "确定",
      onOk: async () => {
        const index = comlibs.findIndex(
          ({ namespace }) => namespace === comlib.namespace
        );
        comlibs.splice(index, 1);
        await saveConfig({ ...configRef.current, comlibs });
        setComlibs([...comlibs]);
      },
    });
  };

  const saveConfig = async (config: Record<string, any>) => {
    return await API.Setting.saveSetting(_NAMESPACE_, config, user.email);
  };
	
	const onChangeDesigner = event => {
		const value = event.target.value;
		if (!value || !/^https?:\/\/.*\.js$/.test(value)) {
			message.error("设计器链接格式错误");
			return;
		}
		if (value) {
			setDesigner(value);
			saveConfig({ ...configRef.current, comlibs, designer: value }).then(() => {
				message.success("更新成功");
			})
		}
	};

  return (
		<>
			<div>组件库：</div>
	    <div style={{ padding: 24 }}>
	      <Space>
	        {(comlibs || []).map((comlib) => {
	          const { title, updateTime, user, avatar } = comlib;
	          return (
	            <Card
	              style={{ width: 280 }}
	              hoverable
	              cover={
	                <img
	                  alt="avatar"
	                  src={
	                    avatar ??
	                    "https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/compress/image-8ee8592d-b941-494c-ab23-907eb0d2266a.png"
	                  }
	                />
	              }
	              actions={[
	                <EditOutlined key="edit" onClick={() => onEdit(comlib)} />,
	                <DeleteOutlined
	                  key="delete"
	                  onClick={() => onDelete(comlib)}
	                />,
	              ]}
	            >
	              <Meta
	                avatar={<Avatar src={user.avatar} />}
	                title={title}
	                description={`${user.email} 更新于 ${updateTime}`}
	              />
	            </Card>
	          );
	        })}
	        <div className={styles.append} onClick={onAdd}>
	          <PlusOutlined />
	          <span style={{ marginTop: 10 }}>添加</span>
	        </div>
	      </Space>
	      <AppendModal
	        visible={visible}
	        status={status}
	        comlib={currentComlib}
	        onOk={onOk}
	        onCancel={onCancel}
	      />
	    </div>
			<div style={{ marginBottom: '24px' }}>设计器：</div>
			<Input value={designer} onChange={e => setDesigner(e.target.value)} onBlur={onChangeDesigner} style={{ width: '80%' }} />
		</>
  );
};
