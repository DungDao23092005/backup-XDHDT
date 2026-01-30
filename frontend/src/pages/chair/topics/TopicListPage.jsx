import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getTopicsByTrack,
  createTopic,
  deleteTopic
} from '../../../api/topicApi';

const TopicListPage = () => {
  const { trackId } = useParams();
  const [topics, setTopics] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchTopics = async () => {
    const res = await getTopicsByTrack(trackId);
    setTopics(res.data);
  };

  useEffect(() => {
    fetchTopics();
  }, [trackId]);

  const handleCreate = async () => {
    if (!name) return alert('Tên topic không được rỗng');

    await createTopic(trackId, { name, description });
    setName('');
    setDescription('');
    fetchTopics();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Xóa topic này?')) {
      await deleteTopic(id);
      fetchTopics();
    }
  };

  return (
    <div>
      <h2>📌 Danh sách Topic</h2>

      <div>
        <input
          placeholder="Tên topic"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          placeholder="Mô tả"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <button onClick={handleCreate}>➕ Tạo Topic</button>
      </div>

      <ul>
        {topics.map(t => (
          <li key={t.id}>
            <b>{t.name}</b> – {t.description}
            <button onClick={() => handleDelete(t.id)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopicListPage;
