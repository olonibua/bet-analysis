# Sports Probability Engine

A data-driven betting intelligence platform that analyzes historical sports data to predict Sub-Market outcomes across upcoming fixtures.

## 🎯 Features

### Core Functionality
- **Automated Data Crawling**: Fetches upcoming fixtures from Football-data.org API
- **Historical Analysis**: Analyzes historical match data for pattern recognition
- **Probability Calculations**: Generates predictions for various Sub-Markets:
  - Main Markets (1X2)
  - Over/Under Goals (1.5, 2.5, 3.5)
  - Both Teams to Score (BTTS)
  - Future: Corners, Cards, Player props

### User Experience
- **Dashboard Interface**: Clean, probability-focused layout
- **Event Cards**: Display top 3 highest-probability Sub-Markets per event
- **Advanced Filtering**: Filter by league, confidence level, date range
- **Responsive Design**: Optimized for desktop, tablet, and mobile

### Data Intelligence
- **Confidence Levels**: High (80%+), Medium (65-79%), Low (50-64%)
- **Sample Size Tracking**: Shows number of historical matches analyzed
- **Real-time Updates**: Probability calculations updated every 30 minutes
- **Export Capabilities**: CSV, PDF, and API access

## 🏗 Architecture

### Frontend
- **Next.js 15.5.3** - React framework with App Router
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Modern icon library

### Backend & Database
- **Appwrite** - Backend-as-a-Service for database and APIs
- **MCP Integration** - Model Context Protocol for data management

### Data Sources
- **Football-data.org** - Primary API for fixtures and basic match data
- **API-Football** - Enhanced statistics and detailed match data
- **FootyStats** - Betting-specific Sub-Market data

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Appwrite account and project setup
- Football-data.org API key (free tier available)

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd betanalyst
   npm install
   ```

2. **Environment Setup**:
   Copy `.env.local` and update with your credentials:
   ```env
   # Appwrite Configuration (already set up)
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
   NEXT_PUBLIC_APPWRITE_API_KEY=your_api_key

   # Football Data API
   FOOTBALL_DATA_API_KEY=your_football_data_api_key
   ```

3. **Get Football-data.org API Key**:
   - Visit https://www.football-data.org/client/register
   - Register for free account (100 requests/day)
   - Replace `your_football_data_api_key_here` in `.env.local`

4. **Start development server**:
   ```bash
   npm run dev
   ```

   Access the application at http://localhost:3000

### Database Setup

The application uses Appwrite collections that will be automatically created:

- **Events**: Upcoming fixtures and match information
- **Matches**: Historical match results with statistics
- **Probabilities**: Calculated Sub-Market probabilities
- **Teams**: Team information and metadata

## 📊 API Endpoints

### Health Check
```bash
GET /api/health
```
Returns system health status and component connectivity.

### Data Sync
```bash
POST /api/sync?action=full    # Full sync: crawl + calculate
POST /api/sync?action=crawl   # Only crawl new data
POST /api/sync?action=calculate # Only calculate probabilities
GET /api/sync                 # Check sync status
```

## 🔄 Data Pipeline

1. **Data Crawling** (Every 30 minutes):
   - Fetch upcoming fixtures from Football-data.org
   - Store new events in Appwrite database
   - Update team information

2. **Historical Analysis**:
   - Fetch completed matches for probability calculations
   - Store match statistics and outcomes
   - Maintain 3+ years of historical data

3. **Probability Calculation**:
   - Analyze historical patterns for each fixture
   - Calculate Sub-Market probabilities using multiple models
   - Apply confidence levels based on sample size and consistency

4. **Real-time Updates**:
   - Update probabilities when new data is available
   - Refresh calculations every 30 minutes
   - Cache frequently accessed data for performance

## 📈 Probability Models

### Main Market (1X2)
- Home/Away win ratios from historical matches
- Home advantage factor (+5%)
- Head-to-head performance weighting

### Over/Under Goals
- Goal average analysis from recent matches
- Team attacking/defensive form consideration
- League-specific goal patterns

### Both Teams to Score
- Historical BTTS rate for both teams
- Recent form and attacking capabilities
- Defensive consistency analysis

## 🎯 Performance Metrics

### Target KPIs (MVP)
- **Data Coverage**: 100+ upcoming events weekly
- **Prediction Accuracy**: 65%+ for high-confidence predictions
- **Response Time**: <3 second page loads, <500ms API responses
- **Reliability**: 99%+ uptime with error handling

### Success Criteria
- **User Engagement**: 70% reduction in manual research time
- **Accuracy**: Consistent 70%+ success rate for high-confidence predictions
- **Coverage**: 500+ events per weekend across major leagues

## 🔧 Development

### Project Structure
```
betanalyst/
├── app/                    # Next.js App Router
│   ├── components/         # UI components
│   ├── api/               # API routes
│   └── page.tsx           # Main dashboard
├── lib/                   # Core libraries
│   ├── appwrite.ts        # Database configuration
│   ├── football-api.ts    # Sports data integration
│   ├── data-crawler.ts    # Data collection service
│   ├── probability-engine.ts # Calculation algorithms
│   ├── database.ts        # Database operations
│   └── types.ts          # TypeScript definitions
└── ...
```

### Key Components
- **EventCard**: Individual match display with top probabilities
- **FilterControls**: League, confidence, and date filtering
- **StatsOverview**: System statistics and performance metrics

## 🚀 Deployment

### Production Setup
1. Set up Appwrite production instance
2. Configure environment variables for production
3. Set up scheduled cron jobs for data crawling
4. Deploy to Vercel/Netlify with appropriate build configuration

### Monitoring
- Health check endpoint for system monitoring
- Error tracking and logging
- Performance metrics and uptime monitoring
- Data quality validation and alerts

## 📝 Next Steps

### Phase 2 Enhancements (Weeks 3-4)
- [ ] Multi-sport support (Basketball, Tennis)
- [ ] API-Football integration for enhanced statistics
- [ ] Advanced probability models (weighted recency, form analysis)
- [ ] Mobile application development

### Phase 3 Scaling (Weeks 5-6)
- [ ] Machine learning integration
- [ ] Advanced analytics and insights
- [ ] API for third-party developers
- [ ] International market expansion

## ⚖️ Legal & Compliance

- **Educational Purpose**: Platform displays probability analysis for educational purposes only
- **Responsible Gambling**: Includes appropriate warnings and disclaimers
- **Data Privacy**: GDPR-compliant data handling practices
- **API Terms**: Compliant with sports data provider terms of service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Disclaimer**: This platform is for educational and research purposes only. All predictions are based on historical data analysis and should not be considered as betting advice. Always gamble responsibly and within your means.