# 🏠 Stay Pro

### Gestão Profissional de Locação por Temporada

![Status](https://img.shields.io/badge/status-production-green)
![Security](https://img.shields.io/badge/security-OWASP%20Top%2010-brightgreen)

---

Sistema completo para gestão de locações por temporada com multi-imóvel, controle de equipe, relatórios financeiros, logs de auditoria e conformidade com LGPD.

---

## 🌐 Aplicação

| | |
|---|---|
| **URL** | [https://stay-pro.ai.studio](https://stay-pro.ai.studio) |
| **Status** | 🟢 Produção |
| **Versão** | 2.2.3 |

---

## 📋 Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 🏢 **Multi-Imóvel** | Isolamento total de dados entre proprietários com seletor rápido |
| 📅 **Calendário** | Visualização mensal, validação de conflitos e gap de limpeza |
| 💰 **Financeiro** | Cálculo automático, gestão de sinal/saldo e relatórios |
| 👥 **Equipe (RBAC)** | Administrador e Colaborador com permissões granulares |
| 🔒 **Segurança** | 2FA, criptografia AES-256, PBKDF2 e logs de auditoria |
| 🔔 **Alertas** | Webhooks para Slack, Teams e Discord |

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Node.js, Express |
| **Banco de Dados** | Firestore |
| **Autenticação** | JWT com refresh token, 2FA TOTP |
| **Segurança** | Helmet.js, CORS, Rate Limiter, AES-256, PBKDF2 |
| **Deploy** | Google Cloud Run |
| **Monitoramento** | Cloud Logging, Cloud Monitoring |

---

## 🔒 Segurança

| Recurso | Descrição |
|---------|-----------|
| **Autenticação** | JWT com expiração de 15 min e refresh token de 7 dias |
| **2FA** | TOTP (Google Authenticator) com códigos de backup |
| **Criptografia** | AES-256 para CPF de hóspedes com PBKDF2 |
| **Logs** | Auditoria completa com IP, User-Agent e geolocalização |
| **Rate Limiter** | 5 tentativas de login / 15 min |
| **Proteção** | Helmet.js, CORS restrito, sanitização de inputs |
| **LGPD** | Consentimento explícito, exclusão de dados e política de retenção |

---

## 📦 Como Executar Localmente

| Passo | Comando |
|-------|---------|
| **Clone o repositório** | `git clone https://github.com/luizfabiocode/Stay-Pro.git` |
| **Acesse a pasta** | `cd Stay-Pro` |
| **Instale as dependências** | `npm install` |
| **Configure as variáveis** | `cp .env.example .env` |
| **Inicie o servidor** | `npm run dev` |
| **Acesse** | `http://localhost:3000` |

---

## 🔑 Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `ENCRYPTION_MASTER_KEY` | Chave para criptografia AES-256 (32 bytes) |
| `JWT_SECRET` | Chave para assinatura de tokens JWT (48 bytes) |
| `ALLOWED_ORIGINS` | Domínios autorizados para CORS |
| `BACKUP_RETENTION_DAYS` | Dias de retenção de backups |
| `WEBHOOK_SECURITY_URL` | URL para alertas de segurança |

---

## 📊 Regras de Negócio

| Regra | Status |
|-------|--------|
| Check-in antes do Check-out | ✅ |
| Período mínimo de estadia | ✅ |
| Gap de limpeza | ✅ |
| Validação de CPF (Módulo 11) | ✅ |
| Colaborador não exclui reservas | ✅ |
| Isolamento multi-imóvel | ✅ |
| Criptografia de dados sensíveis | ✅ |
| Logs de auditoria | ✅ |

---

## 👤 Autor

**Luiz Fabio Camargo de Oliveira**

| Rede | Link |
|------|------|
| **LinkedIn** | [linkedin.com/in/luiz-fabio-819b2b34b](https://www.linkedin.com/in/luiz-fabio-819b2b34b/) |
| **GitHub** | [github.com/luizfabiocode](https://github.com/luizfabiocode) |
| **E-mail** | luizfabicodecamargo@gmail.com |

---

## 📄 Licença

Este projeto está sob a licença MIT.

---

⭐ **Se este projeto ajudou você, considere dar uma estrela!** ⭐
