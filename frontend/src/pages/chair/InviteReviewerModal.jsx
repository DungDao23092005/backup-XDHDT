import React, { useState } from "react";
import reviewerApi from "../../api/reviewerApi";

export default function InviteReviewerModal({
  open,
  onClose,
  onSuccess,
}) {
  const [reviewerName, setReviewerName] = useState("");
  const [email, setEmail] = useState("");
  const [conferenceId, setConferenceId] = useState("");
  const [field, setField] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

const handleSubmit = async () => {
  if (!email || !reviewerName || !conferenceId) {
  alert("Vui lòng nhập đầy đủ thông tin");
  return;
}


  try {
    setLoading(true);

    await reviewerApi.inviteReviewer({
      reviewer_email: email,
      reviewer_name: reviewerName, // ✅ dùng đúng input người nhập
      conference_id: Number(conferenceId),
      description: field,
    });


    alert("Đã gửi lời mời reviewer");
    onSuccess?.();
    onClose();
  } catch (err) {
    alert("Mời reviewer thất bại");
    console.error(err?.response?.data || err);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[420px] rounded-2xl p-6 space-y-4">
        <h3 className="text-3xl font-black text-slate-900">Mời Reviewer</h3>

        <input
          placeholder="Email reviewer"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        />

        <input
          placeholder="Tên reviewer"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        />


        <input
          placeholder="Conference ID"
          value={conferenceId}
          onChange={(e) => setConferenceId(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        />

        <input
          placeholder="Nhập lời nhắn"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        />

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold"
          >
            {loading ? "Đang gửi..." : "Mời"}
          </button>
        </div>
      </div>
    </div>
  );
}
