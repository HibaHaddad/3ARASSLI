import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { getStoredUser } from "../services/auth";
import "./provider.css";
import "./client.css";

const ChatPage = () => {
  const [services, setServices] = useState([]);
  const [chatPreview, setChatPreview] = useState([]);
  const [messages, setMessages] = useState([]);
  const [receiverId, setReceiverId] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const currentUserId = Number(getStoredUser()?.id || 0);

  const loadServices = async () => {
    try {
      const response = await api.get("/api/services");
      setServices(response.data.services || []);
      if (!receiverId && response.data.services?.length) {
        setReceiverId(String(response.data.services[0].prestataire_id));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les prestataires.");
    }
  };

  const loadChatPreview = async () => {
    try {
      const response = await api.get("/api/chat");
      const allMessages = response.data.messages || [];
      const latestBySender = new Map();

      allMessages.forEach((message) => {
        const senderId = Number(message.sender_id);
        const receiverIdFromMessage = Number(message.receiver_id);
        const otherUserId = senderId === currentUserId ? receiverIdFromMessage : senderId;
        const previous = latestBySender.get(otherUserId);
        const currentDate = new Date(message.timestamp || 0);
        const previousDate = previous ? new Date(previous.timestamp || 0) : new Date(0);

        if (!previous || currentDate > previousDate) {
          latestBySender.set(otherUserId, message);
        }
      });

      setChatPreview(Array.from(latestBySender.values()));
    } catch {
      setChatPreview([]);
    }
  };

  const loadMessages = async (id) => {
    if (!id) {
      return;
    }
    try {
      const response = await api.get("/api/chat", { params: { with_user_id: id } });
      setMessages(response.data.messages || []);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les messages.");
    }
  };

  useEffect(() => {
    loadServices();
    loadChatPreview();
  }, []);

  useEffect(() => {
    loadMessages(receiverId);
  }, [receiverId]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!receiverId || !content.trim()) {
      return;
    }
    try {
      await api.post("/api/chat/send", { receiver_id: Number(receiverId), content: content.trim() });
      setContent("");
      loadMessages(receiverId);
      loadChatPreview();
    } catch (err) {
      setError(err.response?.data?.message || "Envoi impossible.");
    }
  };

  const conversations = useMemo(() => {
    const unique = new Map();

    services.forEach((service) => {
      if (!unique.has(service.prestataire_id)) {
        const preview = chatPreview.find(
          (item) =>
            Number(item.sender_id) === Number(service.prestataire_id) ||
            Number(item.receiver_id) === Number(service.prestataire_id)
        );

        unique.set(service.prestataire_id, {
          id: service.prestataire_id,
          name: service.prestataire_name,
          excerpt: preview?.content || "Commencez la conversation avec ce prestataire.",
          time: preview?.timestamp ? new Date(preview.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--",
        });
      }
    });

    return Array.from(unique.values());
  }, [services, chatPreview]);

  const activeConversation = conversations.find((item) => String(item.id) === String(receiverId));

  return (
    <div className="client-page">
      <Navbar />
      <main className="client-main">
        <section className="client-shell">
          <aside className="client-sidebar">
            <div className="client-sidebar-brand">
              <p className="client-eyebrow">Client</p>
              <h1>Messagerie</h1>
              <span>Discutez directement avec vos prestataires.</span>
            </div>

            <nav className="client-sidebar-nav">
              <Link className="client-sidebar-link" to="/client-dashboard">
                <strong>Dashboard</strong>
                <small>Recherche, services, reservation</small>
              </Link>
              <Link className="client-sidebar-link" to="/favorites">
                <strong>Favoris</strong>
                <small>Prestataires sauvegardes</small>
              </Link>
              <Link className="client-sidebar-link" to="/planner">
                <strong>Planner</strong>
                <small>Checklist mariage</small>
              </Link>
              <Link className="client-sidebar-link active" to="/chat">
                <strong>Chat</strong>
                <small>Conversation en direct</small>
              </Link>
            </nav>
          </aside>

          <section className="client-content">
            <header className="client-content-header">
              <div>
                <p className="client-section-label">Chat client</p>
                <h2>Conversations en temps reel</h2>
                <p>Le meme style premium que l’espace prestataire, avec une lecture plus claire.</p>
              </div>
            </header>

            {error ? <p className="client-error">{error}</p> : null}

            <article className="provider-panel provider-chat-shell">
              <div className="provider-chat-sidebar">
                <div className="provider-panel-head">
                  <h3>Conversations</h3>
                  <p>Selectionnez un prestataire pour afficher vos messages.</p>
                </div>

                <div className="provider-chat-list">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`provider-chat-item ${String(receiverId) === String(conversation.id) ? "active" : ""}`}
                      onClick={() => setReceiverId(String(conversation.id))}
                    >
                      <span className="provider-chat-avatar">
                        {conversation.name?.slice(0, 2).toUpperCase() || "PR"}
                      </span>
                      <div>
                        <strong>{conversation.name}</strong>
                        <p>{conversation.excerpt}</p>
                      </div>
                      <span className="provider-chat-meta">
                        <em>{conversation.time}</em>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="provider-chat-window">
                <div className="provider-chat-window-head">
                  <div>
                    <h3>{activeConversation?.name || "Choisir une conversation"}</h3>
                    <p>{activeConversation ? "Conversation active" : "Aucun prestataire selectionne"}</p>
                  </div>
                  <span className="provider-status validated">En ligne</span>
                </div>

                <div className="provider-chat-messages">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`provider-message-bubble ${
                        Number(message.sender_id) === Number(receiverId) ? "client" : "provider"
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>

                <form className="provider-chat-form" onSubmit={sendMessage}>
                  <input
                    type="text"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Ecrire un message..."
                  />
                  <button type="submit" className="provider-primary-btn">
                    Envoyer
                  </button>
                </form>
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  );
};

export default ChatPage;
