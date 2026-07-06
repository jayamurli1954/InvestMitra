\# Investment Framework 📈



A comprehensive multi-currency, multi-exchange portfolio management platform with real-time market data, AI-powered insights, and advanced analytics capabilities.



!\[License](https://img.shields.io/badge/license-MIT-blue.svg)

!\[Python](https://img.shields.io/badge/python-3.8+-blue.svg)

!\[React](https://img.shields.io/badge/react-18.0+-blue.svg)

!\[Status](https://img.shields.io/badge/status-active%20development-green.svg)



---



\## 🌟 Overview



Investment Framework is a full-stack web application designed to help investors track, analyze, and manage their investment portfolios across multiple currencies and global exchanges. Built with modern technologies, it provides real-time market data, AI-driven insights, and comprehensive portfolio analytics in one unified platform.



\*\*Think of it as your personal Bloomberg terminal for retail investing.\*\*



---



\## ✨ Key Features



\### 📊 Real-Time Market Data

\- \*\*Two-Line Live Ticker\*\*: Continuously streaming major international indices and stocks

&nbsp; - Major Indices: S\&P 500, NASDAQ, DOW, NIFTY 50, SENSEX, DAX, FTSE, etc.

&nbsp; - Popular Stocks: AAPL, MSFT, GOOGL, TSLA, RELIANCE, TCS, and more

\- Real-time price updates and market movements

\- Multi-exchange support (NSE, BSE, NYSE, NASDAQ, LSE, etc.)



\### 💼 Portfolio Management

\- \*\*Multi-Currency Support\*\*: Track investments in USD, EUR, INR, GBP, JPY, and more

\- \*\*Multi-Exchange Integration\*\*: Manage holdings across global stock exchanges

\- Comprehensive portfolio tracking with P\&L calculations

\- Asset allocation visualization

\- Performance metrics and analytics



\### 🤖 AI-Powered Insights

\- Intelligent investment recommendations

\- Market trend analysis

\- Risk assessment and predictions

\- Portfolio optimization suggestions



\### 📉 Backtesting Engine

\- Test trading strategies against historical data

\- Performance simulation and analysis

\- Risk/reward calculations

\- Strategy optimization tools



\### 📑 Tax Reporting \& Compliance

\- Automated tax calculation

\- Capital gains/losses tracking

\- Tax-loss harvesting opportunities

\- Export reports for filing



\### 📱 User Interface

\- 16+ functional pages

\- Responsive design for desktop and mobile

\- Intuitive navigation and user experience

\- Real-time two-line ticker display



---



\## 🛠️ Technology Stack



\### Backend

\- \*\*Framework\*\*: FastAPI (Python)

\- \*\*Database\*\*: MongoDB

\- \*\*API Integration\*\*: Real-time market data APIs

\- \*\*Authentication\*\*: JWT-based



\### Frontend

\- \*\*Framework\*\*: React 18+

\- \*\*State Management\*\*: React Context API

\- \*\*Styling\*\*: CSS3 with custom components

\- \*\*Charts\*\*: Chart.js for data visualization

\- \*\*HTTP Client\*\*: Axios

\- \*\*Desktop App\*\*: Electron integration



\### DevOps \& Tools

\- \*\*Version Control\*\*: Git \& GitHub

\- \*\*Package Managers\*\*: npm (frontend), pip (backend)



---



\## 📋 Prerequisites



Before you begin, ensure you have the following installed:



\- \*\*Python\*\* 3.8 or higher

\- \*\*Node.js\*\* 16.x or higher

\- \*\*npm\*\* or \*\*yarn\*\*

\- \*\*MongoDB\*\* (local or Atlas account)

\- \*\*Git\*\*



---



\## 🚀 Installation



\### Step 1: Clone the Repository

```bash

git clone https://github.com/jayamurli1954/investment\_framework\_build.git

cd investment\_framework\_build

```



\### Step 2: Backend Setup

```bash

\# Create virtual environment

python -m venv investenv



\# Activate virtual environment

\# On Windows:

investenv\\Scripts\\activate



\# Install dependencies

pip install -r requirements.txt



\# Create .env file for environment variables

\# Add your configuration (see Backend Configuration below)

```



\*\*Backend .env Configuration:\*\*

```env

MONGODB\_URI=mongodb://localhost:27017/investment\_framework

SECRET\_KEY=your-secret-key-here

API\_KEY\_MARKET\_DATA=your-api-key

CORS\_ORIGINS=http://localhost:3000

```



\### Step 3: Frontend Setup

```bash

\# Navigate to frontend directory

cd frontend



\# Install dependencies

npm install



\# Create .env file (if needed)

```



\*\*Frontend .env Configuration:\*\*

```env

REACT\_APP\_API\_URL=http://127.0.0.1:9001

REACT\_APP\_WS\_URL=ws://127.0.0.1:9001

```



\### Step 4: Database Setup

```bash

\# Start MongoDB service

\# If using MongoDB Atlas, update MONGODB\_URI in backend/.env

```



---



\## 🎯 Usage



\### Starting the Application



\*\*Method 1: Using PowerShell Script (Recommended)\*\*

```bash

.\\start-app.ps1

```



\*\*Method 2: Manual Start\*\*



\*\*Terminal 1 - Backend:\*\*

```bash

\# Activate virtual environment

investenv\\Scripts\\activate



\# Start backend server

cd backend

python server.py

```



Backend will be available at: `http://127.0.0.1:9001`



\*\*Terminal 2 - Frontend:\*\*

```bash

cd frontend

npm start

```



Frontend will be available at: `http://localhost:3000`



\### API Documentation



Once the backend is running, access the interactive API documentation:

\- Swagger UI: `http://127.0.0.1:9001/docs`

\- ReDoc: `http://127.0.0.1:9001/redoc`



---



\## 📁 Project Structure

```

investment\_framework\_build/

├── backend/

│   ├── server.py              # Main FastAPI application

│   ├── market\_data.py         # Market data handling

│   ├── bulk\_load\_stocks.py   # Stock data loader

│   └── requirements.txt       # Python dependencies

│

├── frontend/

│   ├── public/

│   │   └── electron.js        # Electron configuration

│   ├── src/

│   │   ├── components/

│   │   │   └── Marquee.jsx    # Live ticker component

│   │   ├── pages/

│   │   │   ├── Auth.jsx       # Authentication

│   │   │   ├── Portfolio.jsx # Portfolio management

│   │   │   ├── Watchlist.jsx # Watchlist tracking

│   │   │   ├── Alerts.jsx    # Price alerts

│   │   │   ├── StockDetail.jsx

│   │   │   └── ProfileSettings.jsx

│   │   ├── App.js

│   │   └── index.css

│   └── package.json

│

├── start-app.ps1              # Startup script

├── .gitignore

├── LICENSE

└── README.md

```



---



\## 🎨 Features Showcase



\### Real-Time Two-Line Ticker

\- Continuously scrolling display of major indices and stocks

\- Updates in real-time with price changes

\- Color-coded for gains (green) and losses (red)

\- Supports international markets



\### Multi-Currency Portfolio

\- Track investments across different currencies

\- Automatic currency conversion

\- Real-time exchange rates

\- Consolidated portfolio view



\### Multi-Exchange Support

\- NSE (National Stock Exchange, India)

\- BSE (Bombay Stock Exchange, India)

\- NYSE (New York Stock Exchange, USA)

\- NASDAQ (USA)

\- LSE (London Stock Exchange, UK)

\- And more...



---



\## 🗺️ Roadmap



\### Current Status (~80% Complete)



\#### ✅ Completed Features

\- \[x] Multi-currency support

\- \[x] Multi-exchange integration

\- \[x] Real-time two-line ticker (Marquee component)

\- \[x] Portfolio tracking interface

\- \[x] Watchlist management

\- \[x] Stock detail pages

\- \[x] Price alerts system

\- \[x] AI insights module

\- \[x] Backtesting engine

\- \[x] Tax reporting features

\- \[x] User authentication UI

\- \[x] Profile settings

\- \[x] FastAPI backend with market data

\- \[x] React frontend with 16+ pages

\- \[x] Electron desktop app integration



\#### 🚧 In Progress

\- \[ ] MongoDB integration completion

\- \[ ] Full authentication backend

\- \[ ] User registration and login flow

\- \[ ] Session management

\- \[ ] Data persistence



\#### 📅 Planned Features

\- \[ ] Email notifications for price alerts

\- \[ ] Advanced charting tools (candlestick charts)

\- \[ ] Social features (share portfolios, ideas)

\- \[ ] Mobile app (React Native)

\- \[ ] Cryptocurrency support

\- \[ ] Options and derivatives tracking

\- \[ ] Automated trading capabilities

\- \[ ] Export to Excel/PDF

\- \[ ] Multi-language support

\- \[ ] Dark theme

\- \[ ] Real-time collaboration



---



\## 🤝 Contributing



Contributions are welcome! Please feel free to submit a Pull Request.



\### How to Contribute



1\. \*\*Fork the repository\*\*

2\. \*\*Create your feature branch\*\*

```bash

&nbsp;  git checkout -b feature/AmazingFeature

```

3\. \*\*Commit your changes\*\*

```bash

&nbsp;  git commit -m 'Add some AmazingFeature'

```

4\. \*\*Push to the branch\*\*

```bash

&nbsp;  git push origin feature/AmazingFeature

```

5\. \*\*Open a Pull Request\*\*



\### Contribution Guidelines



\- Write clear, concise commit messages

\- Add comments to complex code sections

\- Update documentation for new features

\- Test your changes thoroughly

\- Follow the existing code style

\- Do not commit sensitive files (.env, API keys, passwords)



---



\## 🐛 Known Issues



\- MongoDB integration pending completion

\- Authentication system under development

\- Some API endpoints may require optimization

\- Mobile responsiveness needs testing on all devices

\- Currency conversion rates may need caching



---



\## 📝 License



This project is licensed under the MIT License - see the \[LICENSE](LICENSE) file for details.



\### MIT License Summary

```

Copyright (c) 2025 Muralidhar



Permission is hereby granted, free of charge, to any person obtaining a copy

of this software and associated documentation files (the "Software"), to deal

in the Software without restriction, including without limitation the rights

to use, copy, modify, merge, publish, distribute, sublicense, and/or sell

copies of the Software, subject to the following conditions:



The above copyright notice and this permission notice shall be included in all

copies or substantial portions of the Software.



THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR

IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,

FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE

AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER

LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,

OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE

SOFTWARE.

```



---



\## 📧 Contact



\*\*Muralidhar\*\* - GitHub: \[@jayamurli1954](https://github.com/jayamurli1954)



\*\*Project Link\*\*: \[https://github.com/jayamurli1954/investment\_framework\_build](https://github.com/jayamurli1954/investment\_framework\_build)



---



\## 🙏 Acknowledgments



\- \[FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework

\- \[React](https://reactjs.org/) - JavaScript library for building user interfaces

\- \[MongoDB](https://www.mongodb.com/) - NoSQL database

\- \[Electron](https://www.electronjs.org/) - Desktop application framework

\- Market data providers

\- Open source community



---



\## ⚠️ Disclaimer



\*\*This software is for educational and informational purposes only.\*\*



\- Not financial advice

\- No warranty or guarantee of accuracy

\- Use at your own risk

\- Past performance does not guarantee future results

\- Always consult with qualified financial advisors

\- Creator assumes no liability for investment decisions

\- This tool is designed for personal portfolio tracking and analysis only



---



\## 📊 Project Stats



!\[GitHub stars](https://img.shields.io/github/stars/jayamurli1954/investment\_framework\_build?style=social)

!\[GitHub forks](https://img.shields.io/github/forks/jayamurli1954/investment\_framework\_build?style=social)



---



<div align="center">



\*\*⭐ Star this repository if you find it helpful! ⭐\*\*



Made with ❤️ by Muralidhar



</div>

