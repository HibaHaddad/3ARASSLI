import React from "react";

const MessageItem = ({ chat, onClick }) => {
  return (
    <button type="button" className="provider-message-item" onClick={onClick}>
      <span className="provider-chat-avatar">{chat.avatar}</span>
      <div className="provider-message-copy">
        <strong>{chat.client}</strong>
        <p>{chat.excerpt}</p>
      </div>
      <div className="provider-message-meta">
        <em>{chat.time}</em>
        {chat.unread > 0 ? <small>{chat.unread}</small> : null}
      </div>
    </button>
  );
};

export default MessageItem;
