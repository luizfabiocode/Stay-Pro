# 🏠 Stay Pro - Gestão Profissional de Locação por Temporada

![Status](https://img.shields.io/badge/status-production-green)
![Security](https://img.shields.io/badge/security-OWASP%20Top%2010-brightgreen)
![LGPD](https://img.shields.io/badge/LGPD-compliant-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

> Sistema completo para gestão de locações por temporada com multi-imóvel, controle de equipe, relatórios financeiros, logs de auditoria e conformidade com LGPD.

## 🚀 Demo

🔗 **Acesse a aplicação:** [https://stay-pro.ai.studio](https://stay-pro.ai.studio)

## ✨ Funcionalidades

### 🏢 Multi-Imóvel Independente
- Cada usuário gerencia seus próprios imóveis
- Isolamento total de dados entre proprietários
- Seletor rápido no cabeçalho

### 📅 Calendário Inteligente
- Visualização mensal com cores por status
- Validação de conflito de datas
- Gap de limpeza automático
- Bloqueio de manutenção

### 💰 Controle Financeiro
- Cálculo automático de diárias e taxas
- Gestão de sinal e saldo
- Relatórios de faturamento e ocupação
- Exportação para CSV/PDF

### 👥 Gestão de Equipe (RBAC)
- Administrador e Colaborador
- Convite por e-mail (24h)
- Permissões granulares

### 🔒 Segurança Enterprise
- Autenticação JWT com refresh token (15 min/7 dias)
- 2FA (TOTP - Google Authenticator)
- Criptografia AES-256 para CPF
- PBKDF2 com 100.000 iterações
- Logs de auditoria com IP e User-Agent
- Rate limiter (5 tentativas/15 min)
- Webhooks para SIEM/Slack/Teams
- Conformidade LGPD

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Node.js + Express |
| **Banco de Dados** | Firestore |
| **Autenticação** | JWT + 2FA TOTP |
| **Segurança** | Helmet.js, CORS, Rate Limiter, AES-256, PBKDF2 |
| **Deploy** | Google Cloud Run |
| **Monitoramento** | Cloud Logging + Cloud Monitoring |

## 🚀 Como Executar Localmente

```bash
# Clone o repositório
git clone https://github.com/luizfabiocode/Stay-Pro.git
cd Stay-Pro

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Execute em desenvolvimento
npm run dev

# Acesse: http://localhost:3000
