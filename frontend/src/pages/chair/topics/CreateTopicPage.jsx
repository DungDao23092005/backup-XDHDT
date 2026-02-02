import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import conferenceApi from "../../../api/conferenceApi";
import trackApi from "../../../api/trackApi";
import topicApi from "../../../api/topicApi";

const CreateTopicPage = () => {
  const navigate = useNavigate();

  const [conferences, setConferences] = useState([]);
  const [tracks, setTracks] = useState([]);

  const [conferenceId, setConferenceId] = useState("");
  const [trackId, setTrackId] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);

  // ✅ Load conferences từ DB (đúng như CreateTrackPage)
  useEffect(() => {
    conferenceApi
      .getAllConferences()
      .then((res) => {
        console.log("Conferences:", res);
        setConferences(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        console.error(err);
        setConferences([]);
      });
  }, []);

  // ✅ Load tracks theo conference
  useEffect(() => {
    if (!conferenceId) {
      setTracks([]);
      setTrackId("");
      return;
    }

    trackApi
      .getTracksByConferenceId(conferenceId)
      .then((res) => {
        console.log("Tracks:", res);
        setTracks(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        console.error(err);
        setTracks([]);
      });
  }, [conferenceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!trackId) {
      alert("Vui lòng chọn track");
      return;
    }

    setLoading(true);
    try {
      await topicApi.createTopic({
        name,
        description,
        track_id: trackId,
      });

      alert("✅ Tạo topic thành công");
      navigate("/chair");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Tạo topic thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <h2 style={styles.title}>Tạo Topic</h2>

        {/* Conference */}
        <div style={styles.field}>
          <label style={styles.label}>Hội nghị</label>
          <select
            value={conferenceId}
            onChange={(e) => setConferenceId(e.target.value)}
            required
            style={styles.select}
          >
            <option value="">-- Chọn hội nghị --</option>
            {conferences.map((conf) => (
              <option key={conf.id} value={conf.id}>
                {conf.name}
              </option>
            ))}
          </select>

          {/* gợi ý debug nhanh nếu không có data */}
          {conferences.length === 0 && (
            <small style={styles.hint}>
              Không thấy hội nghị? Mở F12 → Console xem log “Conferences:” hoặc kiểm tra API
              <b> /conference/api/conferences/</b>.
            </small>
          )}
        </div>

        {/* Track */}
        <div style={styles.field}>
          <label style={styles.label}>Track</label>
          <select
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            required
            disabled={!conferenceId}
            style={styles.select}
          >
            <option value="">-- Chọn track --</option>
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </select>

          {conferenceId && tracks.length === 0 && (
            <small style={styles.hint}>
              Hội nghị này chưa có track hoặc API tracks đang lỗi.
            </small>
          )}
        </div>

        {/* Topic name */}
        <div style={styles.field}>
          <label style={styles.label}>Tên Topic</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={styles.input}
            placeholder="Nhập tên topic"
          />
        </div>

        {/* Description */}
        <div style={styles.field}>
          <label style={styles.label}>Mô tả</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.textarea}
            placeholder="Mô tả nội dung của topic"
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Đang tạo..." : "Tạo Topic"}
        </button>
      </form>
    </div>
  );
};

const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    padding: "40px 16px",
  },
  form: {
    width: "100%",
    maxWidth: "640px",
    background: "#fff",
    padding: "24px 28px",
    borderRadius: "10px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  title: {
    marginBottom: "18px",
    textAlign: "center",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "14px",
  },
  label: {
    marginBottom: "6px",
    fontWeight: 600,
  },
  select: {
    width: "85%",
    padding: "9px 10px",
    fontSize: "14px",
  },
  input: {
    width: "70%", // ✅ tên topic không quá dài
    padding: "9px 10px",
    fontSize: "14px",
  },
  textarea: {
    minHeight: "140px", // ✅ mô tả cao hơn
    padding: "9px 10px",
    fontSize: "14px",
    resize: "vertical",
  },
  button: {
    marginTop: "10px",
    padding: "10px 12px",
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  hint: {
    marginTop: "6px",
    opacity: 0.8,
  },
};

export default CreateTopicPage;
