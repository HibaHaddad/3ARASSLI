import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "./client.css";

const ChatPage = () => {
  const [services, setServices] = useState([]);
  const [messages, setMessages] = useState([]);
  const [receiverId, setReceiverId] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

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
  }, []);

  useEffect(() => {
    loadMessages(receiverId);
  }, [receiverId]);

  const sendMessage = async () => {
    if (!receiverId || !content.trim()) {
      return;
    }
    try {
      await api.post("/api/chat/send", { receiver_id: Number(receiverId), content: content.trim() });
      setContent("");
      loadMessages(receiverId);
    } catch (err) {
      setError(err.response?.data?.message || "Envoi impossible.");
    }
  };

  return (
    <div className="client-page">
      <Navbar />
      <div className="client-shell client-top">
        <div className="client-panel">
          <h2>Chat</h2>
          <p>Echangez avec vos prestataires.</p>
          <div className="client-actions">
            <Link className="client-btn client-btn-soft" to="/client-dashboard">
              Retour dashboard
            </Link>
          </div>
          {error ? <p className="client-error">{error}</p> : null}
        </div>

        <div className="client-panel">
          <div className="client-filters">
            <select className="client-select" value={receiverId} onChange={(event) => setReceiverId(event.target.value)}>
              <option value="">Prestataire</option>
              {services.map((service) => (
                <option key={`${service.id}-${service.prestataire_id}`} value={service.prestataire_id}>
                  {service.prestataire_name}
                </option>
              ))}
            </select>
            <input className="client-input" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Votre message" />
            <button type="button" className="client-btn client-btn-primary" onClick={sendMessage}>
              Envoyer
            </button>
          </div>
        </div>

        <div className="client-panel">
          <div className="client-chat-list">
            {messages.map((message) => (
              <div key={message.id} className="client-chat-item">
                <div className="client-chat-meta">
                  <span>{message.sender_name}</span>
                  <span>{new Date(message.timestamp).toLocaleString()}</span>
                </div>
                <p>{message.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
