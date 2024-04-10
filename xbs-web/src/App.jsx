import { useEffect, useRef, useState } from 'react';
import { Button, Card, Divider, Input, Modal, Pagination, Space, Typography } from 'antd';
import { useMount, useTitle } from 'ahooks';
import axios from 'axios';

import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import './App.css';

const { Title, Paragraph, Text } = Typography;

const apiUrl = 'http://127.0.0.1:8000'
const axios_config = {
    baseURL: apiUrl,
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST',
    },
};

const idx2label = (idx) => String.fromCharCode('A'.charCodeAt(0) + idx);
const label2idx = (label) => label.charCodeAt(0) - 'A'.charCodeAt(0);

const CodeContent = ({ code, config = { imgSize: 100 }, ...props }) => {
    const generalStyle = {
        pointerEvents: 'none',
        userSelect: 'none',
    };

    if (code.startsWith('!')) {
        return <img src={code.slice(1)} width={config.imgSize} height={config.imgSize} style={generalStyle} {...props} />;
    } else if (code === '|') {
        return <Divider type='vertical' style={generalStyle} {...props} />;
    } else {
        return <span style={generalStyle} {...props}>{code}</span>
    }
};

const DragableCard = ({ dragKey, ...props }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: dragKey,
    });
    const style = {
        ...props.style,
        transform: CSS.Transform.toString(
            transform && {
                ...transform,
                scaleY: 1,
            },
        ),
        // transition,
        cursor: 'move',
        ...(isDragging
            ? {
                position: 'relative',
                zIndex: 9999,
            }
            : {}),
    };
    return <Card {...props} ref={setNodeRef} style={style} {...attributes} {...listeners} />;
};

const Options = ({ task, submit, onSubmit }) => {
    const submitted = submit.find(s => s.id === task.id)?.answer?.split('')?.map((label) => label2idx(label)) || [];
    if (task.type === 'choice') {
        return (
            <Space direction='vertical' size='small'>
                {task.options.map((o, i) => (
                    <Card
                        key={i}
                        classNames={{
                            'body': 'card-body-option',
                        }}
                        styles={{
                            'body': {
                                width: 800,
                                cursor: 'pointer',
                                fontSize: '1.4em',
                                backgroundColor: submitted.includes(i) ? 'lightgreen' : 'snow',
                            },
                        }}
                        onClick={() => onSubmit(idx2label(i))}
                    >
                        {[`(${idx2label(i)}). `].concat(o).map((code, j) => (
                            <CodeContent key={j} code={code} config={{ imgSize: 120 }} />
                        ))}
                    </Card>
                ))}
            </Space>
        )
    } else if (task.type === 'rank') {
        const [ranked, setRanked] = useState(
            submitted ?
                submitted.map((s) => [idx2label(s)].concat(task.options[s])) :
                task.options.map((o, i) => [idx2label(i)].concat(o))
        );
        const sensors = useSensors(
            useSensor(PointerSensor, {
                activationConstraint: {
                    // https://docs.dndkit.com/api-documentation/sensors/pointer#activation-constraints
                    distance: 1,
                },
            }),
        );
        const onDragEnd = ({ active, over }) => {
            if (active.id !== over?.id) {
                setRanked((prev) => {
                    const activeIndex = prev.findIndex((r) => r[0] === active.id);
                    const overIndex = prev.findIndex((r) => r[0] === over?.id);
                    return arrayMove(prev, activeIndex, overIndex);
                });
            }
        };

        return (
            <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
                <SortableContext
                    // rowKey array
                    items={ranked.map((r) => r[0])}
                    strategy={verticalListSortingStrategy}
                >
                    <Space direction='vertical' size='small'>
                        {
                            ranked.map((r, i) => (
                                <DragableCard
                                    key={i}
                                    dragKey={r[0]}
                                    classNames={{
                                        'body': 'card-body-option',
                                    }}
                                    styles={{
                                        'body': {
                                            fontSize: '1.4em',
                                            backgroundColor: submitted.length > 0 ? 'lightgreen' : 'snow',
                                        },
                                    }}
                                >
                                    {[`(${r[0]}). `].concat(r.slice(1)).map((code, j) => (
                                        <CodeContent key={j} code={code} config={{ imgSize: 120 }} />
                                    ))}
                                </DragableCard>
                            )).concat([(
                                <Button
                                    key='submit'
                                    type='primary'
                                    onClick={() => onSubmit(ranked.map((r) => r[0]).join(''))}
                                >
                                    Submit
                                </Button>
                            )])
                        }
                    </Space>
                </SortableContext>
            </DndContext>
        )
    } else {
        console.error('invalid task type', task.type);
        return null;
    }
};

const App = () => {
    const [user, setUser] = useState('');
    const [meta, setMeta] = useState([]);
    const [assignment, setAssignment] = useState([]);
    const [submit, setSubmit] = useState([]);
    const [current, setCurrent] = useState(0);

    const userInputRef = useRef(null);

    useTitle('X-Brick User Study');
    useMount(() => {
        axios.get('/meta', axios_config).then(res => {
            // console.log('meta', res.data);
            setMeta(res.data);
        }).catch(err => {
            console.error('meta', err);
        });
    });
    useEffect(() => {
        if (user === '') return;
        const promise_assignment = axios.get(`/assignment/${user}`, axios_config);
        const promise_submit = axios.get(`/submit/${user}`, axios_config);
        Promise.all([promise_assignment, promise_submit]).then((results) => {
            setAssignment(results[0].data);
            setSubmit(results[1].data);
            const tasks = meta.filter(m => results[0].data.includes(m.id));
            if (results[1].data.length < results[0].data.length) {
                setCurrent(tasks.findIndex(t => !results[1].data.find(s => s.id === t.id)));
            }
        }).catch(err => {
            console.error('assignment & submit', err);
        });
    }, [user]);

    const tasks = meta.filter(m => assignment.includes(m.id));
    const onSubmit = (id, answer) => {
        axios.post(`/submit/${user}`, { id, answer }, axios_config).then(res => {
            // console.log('submit', res.data);
            setSubmit(res.data);
            if (res.data.length < tasks.length) {
                setCurrent(tasks.findIndex(t => !res.data.find(s => s.id === t.id)));
            }
        }).catch(err => {
            console.log('submit', err);
        });
    };

    return (
        <>
            <div className='app'>
                <Typography>
                    <Title>X-Brick User Study</Title>
                    <Paragraph>
                        <Text strong>Hi {user}! </Text>
                        <Text>Welcome to X-Brick User Study. This study will take a few minutes to complete.</Text>
                    </Paragraph>
                    <Paragraph>
                        <Text>You will be presented with questions regarding some abstract categories from compound primitives. </Text>
                    </Paragraph>
                    <Paragraph>
                        <Text>Please follow the instruction to answer the questions subjectively. </Text>
                    </Paragraph>
                </Typography>
                {tasks.length > 0 ? (
                    <>
                        <Pagination
                            current={current + 1}
                            onChange={(page) => setCurrent(page - 1)}
                            total={tasks.length}
                            pageSize={1}
                            showSizeChanger={false}
                            showTotal={(total, range) => `Progress: ${submit.length} / ${total}`}
                        />
                        <div>
                            {tasks[current].question.map((code, i) => (
                                <div className='div-question' key={i}>
                                    <CodeContent code={code} config={{ imgSize: 120 }} />
                                </div>
                            ))}
                        </div>
                        <Options task={tasks[current]} submit={submit} onSubmit={(answer) => onSubmit(tasks[current].id, answer)} />
                    </>
                ) : null}
            </div>
            <Modal
                centered
                closeIcon={null}
                keyboard={false}
                title='X-Brick User Study'
                open={user === ''}
                onOk={() => setUser(userInputRef.current?.input.value)}
            >
                <p>Welcome! Please input your username and click 'OK'.</p>
                <Input ref={userInputRef} placeholder='username' />
            </Modal>
        </>
    );
};

export default App;
