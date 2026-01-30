import axiosClient from './axiosClient';

export const getTopicsByTrack = (trackId) => {
  return axiosClient.get(`/tracks/${trackId}/topics`);
};

export const createTopic = (trackId, data) => {
  return axiosClient.post(`/tracks/${trackId}/topics`, data);
};

export const updateTopic = (topicId, data) => {
  return axiosClient.put(`/topics/${topicId}`, data);
};

export const deleteTopic = (topicId) => {
  return axiosClient.delete(`/topics/${topicId}`);
};
