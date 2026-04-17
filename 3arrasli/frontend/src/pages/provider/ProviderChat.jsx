import React from "react";

const ProviderChat = ({
  chats,
  activeChat,
  activeChatId,
  onOpenChat,
  messageDraft,
  onMessageDraftChange,
  onSendMessage,
}) => {
  return (
    <article className="provider-panel provider-chat-shell">
      <div className="provider-chat-sidebar">
        <div className="provider-panel-head">
          <h3>Conversations</h3>
          <p>Communication directe avec les clients, dans un style plus fluide.</p>
        </div>

        <div className="provider-chat-list">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              className={`provider-chat-item ${activeChatId === chat.id ? "active" : ""}`}
              onClick={() => onOpenChat(chat.id)}
            >
              <span className="provider-chat-avatar">{chat.avatar}</span>
              <div>
                <strong>{chat.client}</strong>
                <p>{chat.excerpt}</p>
              </div>
              <span className="provider-chat-meta">
                <em>{chat.time}</em>
              {chat.unread > 0 ? <small>{chat.unread}</small> : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="provider-chat-window">
        <div className="provider-chat-window-head">
          <div>
            <h3>{activeChat?.client}</h3>
            <p>{activeChat?.subject}</p>
          </div>
          <span className="provider-status validated">En ligne</span>
        </div>

        <div className="provider-chat-messages">
          {activeChat?.messages.map((message) => (
            <div
              key={message.id}
              className={`provider-message-bubble ${message.author === "provider" ? "provider" : "client"}`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <form className="provider-chat-form" onSubmit={onSendMessage}>
          <input
            type="text"
            placeholder="Ecrire un message..."
            value={messageDraft}
            onChange={onMessageDraftChange}
          />
          <button type="submit" className="provider-primary-btn">
            Envoyer
          </button>
        </form>
      </div>
    </article>
  );
};

export default ProviderChat;
