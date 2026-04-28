import React from "react";

const ProviderChat = ({
  chats,
  activeChat,
  activeChatId,
  onOpenChat,
  messageDraft,
  onMessageDraftChange,
  onSendMessage,
  loadingChats,
  sendingMessage,
  chatFeedback,
  typingLabel,
  activePresenceLabel,
  messagesEndRef,
  onMessageDraftBlur,
}) => {
  const hasChats = chats.length > 0;
  const hasMessages = Boolean(activeChat?.messages?.length);
  const canSend = Boolean(messageDraft.trim()) && Boolean(activeChatId) && !sendingMessage;

  return (
    <article className="provider-panel provider-chat-shell">
      <div className="provider-chat-sidebar">
        <div className="provider-panel-head">
          <span className="provider-chat-kicker">Alliance privee</span>
          <h3>Conversations</h3>
          <p>Communication directe avec les clients, dans un style plus fluide.</p>
        </div>

        <div className="provider-chat-list">
          {loadingChats ? (
            <div className="provider-chat-state">Chargement des conversations...</div>
          ) : null}

          {!loadingChats && !hasChats ? (
            <div className="provider-empty-state provider-chat-empty">
              <span>Alliance</span>
              <strong>Aucune conversation pour le moment</strong>
              <p>Vos echanges apparaitront ici des qu'une reservation client sera associee a vos services.</p>
            </div>
          ) : null}

          {!loadingChats
            ? chats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  className={`provider-chat-item ${activeChatId === chat.id ? "active" : ""}`}
                  onClick={() => onOpenChat(chat.id)}
                >
                  <span className="provider-chat-avatar">{chat.avatar}</span>
                  <div className="provider-chat-item-copy">
                    <strong>{chat.client}</strong>
                    <p>{chat.excerpt}</p>
                  </div>
                  <span className="provider-chat-meta">
                    <em>{chat.time}</em>
                    {chat.unread > 0 ? <small>{chat.unread}</small> : null}
                  </span>
                </button>
              ))
            : null}
        </div>
      </div>

      <div className="provider-chat-window">
        {!activeChat ? (
          <div className="provider-empty-state provider-chat-window-empty">
            <span>Maison 3arrasli</span>
            <strong>Selectionnez une conversation</strong>
            <p>Choisissez un client pour retrouver le fil des details, confirmations et petites attentions.</p>
          </div>
        ) : (
          <>
            <div className="provider-chat-window-head">
              <span className="provider-chat-avatar large">{activeChat.avatar}</span>
              <div>
                <small>Conversation client</small>
                <h3>{activeChat.client}</h3>
                <p>{typingLabel || activeChat.subject}</p>
              </div>
              <span className="provider-status validated">{activePresenceLabel || "Hors ligne"}</span>
            </div>

            {chatFeedback?.text ? (
              <div className={`provider-chat-feedback ${chatFeedback.type || "success"}`}>
                {chatFeedback.text}
              </div>
            ) : null}

            <div className="provider-chat-messages">
              {!hasMessages ? (
                <div className="provider-empty-state provider-chat-message-empty">
                  <span>Premier message</span>
                  <strong>Aucun message dans cette conversation</strong>
                  <p>Envoyez une reponse claire et chaleureuse pour lancer l'echange.</p>
                </div>
              ) : null}

              {activeChat.messages.map((message) => (
                <div
                  key={message.id}
                  className={`provider-message-bubble ${
                    message.author === "provider" ? "provider" : "client"
                  }`}
                >
                  <p>{message.text}</p>
                  {message.time ? <span>{message.time}</span> : null}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="provider-chat-form" onSubmit={onSendMessage}>
              <input
                type="text"
                placeholder="Ecrire un message..."
                value={messageDraft}
                onChange={onMessageDraftChange}
                onBlur={onMessageDraftBlur}
                disabled={sendingMessage}
              />
              <button type="submit" className="provider-primary-btn" disabled={!canSend}>
                <span aria-hidden="true">&gt;</span>
                {sendingMessage ? "Envoi..." : "Envoyer"}
              </button>
            </form>
          </>
        )}
      </div>
    </article>
  );
};

export default ProviderChat;
