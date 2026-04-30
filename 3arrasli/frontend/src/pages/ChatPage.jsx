import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { getStoredToken, getStoredUser } from "../services/auth";
import { connectChatSocket, emitRealtimeMessage, emitTypingStatus, joinConversationRoom } from "../services/socket";
import { showToast } from "../services/toast";
import "./provider.css";
import ClientPageLayout from "./client/ClientPageLayout";

const upsertMessage = (items, nextMessage) => {
  if (!nextMessage?.id) {
    return items;
  }
  if (items.some((message) => message.id === nextMessage.id)) {
    return items;
  }
  return [...items, nextMessage].sort(
    (left, right) => new Date(left.timestamp || 0).getTime() - new Date(right.timestamp || 0).getTime()
  );
};

const getOtherUserId = (message, currentUserId) => {
  const senderId = Number(message.sender_id);
  const receiverId = Number(message.receiver_id);
  return senderId === currentUserId ? receiverId : senderId;
};

const ChatPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [chatPreview, setChatPreview] = useState([]);
  const [messages, setMessages] = useState([]);
  const [receiverId, setReceiverId] = useState("");
  const [content, setContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [typingLabel, setTypingLabel] = useState("");
  const [providerOnline, setProviderOnline] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const currentUserId = Number(getStoredUser()?.id || 0);
  const socketRef = useRef(null);
  const joinedConversationIdsRef = useRef(new Set());
  const typingTimeoutRef = useRef(null);
  const stopTypingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeReceiverIdRef = useRef("");

  const loadServices = async () => {
    try {
      const response = await api.get("/api/services");
      const nextServices = response.data.services || [];
      setServices(nextServices);

      const preferredProvider = searchParams.get("provider");
      const fallbackProvider = nextServices[0]?.prestataire_id;
      if (!receiverId && (preferredProvider || fallbackProvider)) {
        setReceiverId(String(preferredProvider || fallbackProvider));
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
        const otherUserId = getOtherUserId(message, currentUserId);
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
    if (error) {
      showToast("error", error);
    }
  }, [error]);

  useEffect(() => {
    const preferredProvider = searchParams.get("provider");
    if (preferredProvider && preferredProvider !== receiverId) {
      setReceiverId(preferredProvider);
    }
  }, [receiverId, searchParams]);

  useEffect(() => {
    loadMessages(receiverId);
    setTypingLabel("");
    setProviderOnline(false);
  }, [receiverId]);

  useEffect(() => {
    if (!receiverId || !socketConnected || !socketRef.current) {
      return;
    }
    // Re-join to force an immediate presence:update for the selected provider.
    joinConversationRoom(socketRef.current, receiverId);
  }, [receiverId, socketConnected]);

  useEffect(() => {
    activeReceiverIdRef.current = receiverId;
  }, [receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typingLabel]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      return undefined;
    }

    const socket = connectChatSocket(token);
    socketRef.current = socket;

    socket.on("socket:ready", () => {
      console.log("[client-chat] socket:ready");
      joinedConversationIdsRef.current.clear();
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[client-chat] disconnect");
      setSocketConnected(false);
    });

    socket.on("receive_message", ({ message, room, client_id, provider_id }) => {
      if (!message) {
        return;
      }

      const otherUserId = getOtherUserId(message, currentUserId);
      console.log("[client-chat] receive_message", {
        room,
        client_id,
        provider_id,
        messageId: message.id,
        otherUserId,
      });

      setChatPreview((prev) => {
        const withoutConversation = prev.filter(
          (item) => getOtherUserId(item, currentUserId) !== otherUserId
        );
        return [...withoutConversation, message].sort(
          (left, right) => new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime()
        );
      });

      if (String(otherUserId) === String(activeReceiverIdRef.current)) {
        setMessages((prev) => upsertMessage(prev, message));
      }
    });

    socket.on("typing_status", ({ user_id, is_typing }) => {
      if (String(user_id) !== String(activeReceiverIdRef.current)) {
        return;
      }

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      setTypingLabel(is_typing ? "Le prestataire ecrit..." : "");
      if (is_typing) {
        typingTimeoutRef.current = window.setTimeout(() => setTypingLabel(""), 1600);
      }
    });

    socket.on("presence:update", ({ provider_id, provider_online }) => {
      if (String(provider_id) === String(activeReceiverIdRef.current)) {
        setProviderOnline(Boolean(provider_online));
      }
    });

    socket.on("socket:error", ({ message }) => {
      if (message) {
        setError(message);
      }
    });

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (stopTypingTimeoutRef.current) {
        window.clearTimeout(stopTypingTimeoutRef.current);
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
      joinedConversationIdsRef.current.clear();
    };
  }, [currentUserId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socketConnected || services.length === 0) {
      return;
    }

    const uniqueProviderIds = [...new Set(services.map((service) => service.prestataire_id).filter(Boolean))];
    uniqueProviderIds.forEach((providerId) => {
      if (joinedConversationIdsRef.current.has(providerId)) {
        return;
      }
      console.log("[client-chat] join_conversation", { providerId });
      joinConversationRoom(socket, providerId);
      joinedConversationIdsRef.current.add(providerId);
    });
  }, [services, socketConnected]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!receiverId || !trimmed || isSending) {
      return;
    }

    setIsSending(true);
    setError("");
    setContent("");
    emitTypingStatus(socketRef.current, receiverId, false);

    try {
      const socketResponse = await emitRealtimeMessage(socketRef.current, receiverId, trimmed);
      console.log("[client-chat] send_message", {
        receiverId,
        success: socketResponse?.success,
      });
      if (!socketResponse?.success) {
        throw new Error(socketResponse?.message || "Envoi impossible.");
      }
    } catch (socketError) {
      try {
        const response = await api.post("/api/chat/send", {
          receiver_id: Number(receiverId),
          content: trimmed,
        });
        if (response.data?.message) {
          setMessages((prev) => upsertMessage(prev, response.data.message));
        }
      } catch (err) {
        setContent(trimmed);
        setError(err.response?.data?.message || socketError.message || "Envoi impossible.");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setContent(nextValue);
    if (!receiverId) {
      return;
    }

    emitTypingStatus(socketRef.current, receiverId, Boolean(nextValue.trim()));
    if (stopTypingTimeoutRef.current) {
      window.clearTimeout(stopTypingTimeoutRef.current);
    }
    stopTypingTimeoutRef.current = window.setTimeout(() => {
      emitTypingStatus(socketRef.current, receiverId, false);
    }, 1100);
  };

  const conversations = useMemo(() => {
    const unique = new Map();

    services.forEach((service) => {
      if (!unique.has(service.prestataire_id)) {
        const preview = chatPreview.find(
          (item) => getOtherUserId(item, currentUserId) === Number(service.prestataire_id)
        );

        unique.set(service.prestataire_id, {
          id: service.prestataire_id,
          name: service.prestataire_name,
          serviceType: service.category || service.type || "Service",
          clientName: getStoredUser()?.name || "Client",
          excerpt: preview?.content || "Commencez la conversation avec ce prestataire.",
          time: preview?.timestamp
            ? new Date(preview.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "--:--",
        });
      }
    });

    return Array.from(unique.values());
  }, [chatPreview, currentUserId, services]);

  const filteredConversations = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      [conversation.name, conversation.serviceType, conversation.clientName]
        .some((value) => String(value || "").toLowerCase().includes(normalized))
    );
  }, [conversations, searchTerm]);

  const activeConversation = conversations.find((item) => String(item.id) === String(receiverId));

  return (
    <ClientPageLayout
      kicker="Chat client"
      title="Conversations mariage."
      description="Un fil de discussion naturel pour confirmer les details, poser vos questions et avancer sereinement."
    >
      <section className="client-section">
        <div className="client-shell">
          <article className="provider-panel provider-chat-shell">
            <div className="provider-chat-sidebar">
              <div className="provider-panel-head">
                <h3>Conversations</h3>
                
              </div>

              <div className="client-chat-search">
                <input
                  type="text"
                  className="client-input"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher par prestataire, service, client..."
                />
              </div>

              <div className="provider-chat-list">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`provider-chat-item ${String(receiverId) === String(conversation.id) ? "active" : ""}`}
                    onClick={() => {
                      setReceiverId(String(conversation.id));
                      setSearchParams({ provider: String(conversation.id) });
                    }}
                  >
                    <span className="provider-chat-avatar">
                      {conversation.name?.slice(0, 2).toUpperCase() || "PR"}
                    </span>
                    <div className="provider-chat-item-body">
                      <div className="provider-chat-item-top">
                        <strong>{conversation.name}</strong>
                        <em>{conversation.time}</em>
                      </div>
                      <p>{conversation.serviceType}</p>
                      <small>{conversation.excerpt}</small>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="provider-chat-window">
              <div className="provider-chat-window-head">
                <div>
                  <small>Conversation mariage</small>
                  <h3>{activeConversation?.name || "Choisir une conversation"}</h3>
                  <p>
                    {typingLabel || (
                      activeConversation
                        ? `${activeConversation.serviceType} • ${activeConversation.clientName}`
                        : "Aucun prestataire selectionne"
                    )}
                  </p>
                </div>
                <span className="provider-status validated">{providerOnline ? "En ligne" : "Hors ligne"}</span>
              </div>

              <div className="provider-chat-messages">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`provider-message-bubble ${
                      Number(message.sender_id) === Number(receiverId) ? "client" : "provider"
                    }`}
                  >
                    <p>{message.content}</p>
                    <span>
                      {message.timestamp
                        ? new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form className="provider-chat-form" onSubmit={sendMessage}>
                <input
                  type="text"
                  value={content}
                  onChange={handleInputChange}
                  onBlur={() => emitTypingStatus(socketRef.current, receiverId, false)}
                  placeholder="Ecrire un message..."
                  disabled={isSending}
                />
                <button type="submit" className="provider-primary-btn" disabled={!receiverId || !content.trim() || isSending}>
                  {isSending ? "Envoi..." : "Envoyer"}
                </button>
              </form>
            </div>
          </article>
        </div>
      </section>
    </ClientPageLayout>
  );
};

export default ChatPage;
