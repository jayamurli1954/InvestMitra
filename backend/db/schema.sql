-- InvestMitra Intelligence Platform V1.1.0 Database Schema
-- Primary System of Record: Supabase PostgreSQL with pgvector extension

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. SECTOR MASTER
CREATE TABLE IF NOT EXISTS sectors (
    sector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sector_name VARCHAR(100) UNIQUE NOT NULL,
    sector_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. COMPANY MASTER
CREATE TABLE IF NOT EXISTS companies (
    company_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    nse_symbol VARCHAR(50) UNIQUE,
    bse_code VARCHAR(50) UNIQUE,
    isin VARCHAR(50) UNIQUE,
    sector_id UUID REFERENCES sectors(sector_id) ON DELETE SET NULL,
    industry VARCHAR(100),
    sub_industry VARCHAR(100),
    business_summary TEXT,
    market_cap_category VARCHAR(20) CHECK (market_cap_category IN ('LARGE_CAP', 'MID_CAP', 'SMALL_CAP', 'MICRO_CAP')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INSTRUMENT MASTER
CREATE TABLE IF NOT EXISTS instruments (
    instrument_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    exchange VARCHAR(10) CHECK (exchange IN ('NSE', 'BSE', 'MCX')),
    symbol VARCHAR(50) NOT NULL,
    lot_size INT DEFAULT 1,
    tick_size NUMERIC(10, 4) DEFAULT 0.05,
    active BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_exchange_symbol UNIQUE (exchange, symbol)
);

-- 4. COMMODITY MASTER
CREATE TABLE IF NOT EXISTS commodities (
    commodity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commodity_name VARCHAR(100) UNIQUE NOT NULL,
    commodity_code VARCHAR(50) UNIQUE NOT NULL,
    unit VARCHAR(20),
    currency VARCHAR(10) DEFAULT 'INR'
);

-- 5. COMPANY EXPOSURES
CREATE TABLE IF NOT EXISTS company_exposures (
    exposure_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    exposure_type VARCHAR(50) NOT NULL CHECK (exposure_type IN ('COMMODITY', 'CURRENCY', 'INTEREST_RATE', 'GEOGRAPHY', 'REGULATORY', 'SUPPLY_CHAIN')),
    target_entity VARCHAR(100) NOT NULL, -- e.g., 'Crude Oil', 'USD/INR', 'Middle East Export'
    exposure_level VARCHAR(20) CHECK (exposure_level IN ('HIGH', 'MEDIUM', 'LOW', 'NONE')),
    direction VARCHAR(20) CHECK (direction IN ('POSITIVE', 'NEGATIVE', 'MIXED')),
    financial_sensitivity TEXT, -- e.g., '10% crude rise impacts EBITDA by 2.5%'
    hedging_policy TEXT,
    confidence_score NUMERIC(3,2) DEFAULT 0.80,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. EVENT SIGNAL & INTELLIGENCE
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('GEOPOLITICAL', 'MACROECONOMIC', 'MONETARY_POLICY', 'COMMODITY', 'REGULATORY', 'SUPPLY_CHAIN', 'CORPORATE', 'EARNINGS')),
    severity VARCHAR(20) CHECK (severity IN ('VERY_HIGH', 'HIGH', 'MODERATE', 'LOW')),
    geography VARCHAR(100),
    source_name VARCHAR(100),
    source_url TEXT,
    event_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. EVENT IMPACT MAPPINGS
CREATE TABLE IF NOT EXISTS event_impacts (
    impact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    sector_id UUID REFERENCES sectors(sector_id) ON DELETE SET NULL,
    impact_direction VARCHAR(20) CHECK (impact_direction IN ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED')),
    impact_magnitude VARCHAR(20) CHECK (impact_magnitude IN ('VERY_HIGH', 'HIGH', 'MODERATE', 'LOW')),
    rationale TEXT NOT NULL,
    counterarguments TEXT,
    time_horizon VARCHAR(20) CHECK (time_horizon IN ('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM')),
    confidence_score NUMERIC(3,2) DEFAULT 0.75,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. SOURCE REGISTRY
CREATE TABLE IF NOT EXISTS sources (
    source_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(100) UNIQUE NOT NULL,
    tier VARCHAR(20) CHECK (tier IN ('PRIMARY_REGULATORY', 'COMPANY_FILING', 'FINANCIAL_DATA', 'REPUTABLE_NEWS', 'GLOBAL_OSINT')),
    reliability_score NUMERIC(3,2) DEFAULT 0.90,
    active BOOLEAN DEFAULT TRUE
);

-- 9. RAG DOCUMENTS & EMBEDDINGS (pgvector)
CREATE TABLE IF NOT EXISTS documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,
    source_id UUID REFERENCES sources(source_id) ON DELETE SET NULL,
    document_title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) CHECK (document_type IN ('ANNUAL_REPORT', 'EARNINGS_CALL', 'INVESTOR_PRESENTATION', 'FILING', 'NEWS_ARTICLE', 'RESEARCH_REPORT')),
    period_year INT,
    period_quarter VARCHAR(5),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    sanitized_content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536), -- OpenAI / Gemini embedding vector dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create HNSW Vector Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 10. AI RESEARCH REPORTS & SEBI COMPLIANCE AUDIT TRAIL
CREATE TABLE IF NOT EXISTS research_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    executive_summary TEXT NOT NULL,
    full_report_markdown TEXT NOT NULL,
    bull_case TEXT,
    bear_case TEXT,
    thesis_breakers TEXT,
    analytical_score NUMERIC(5,2),
    compliance_disclaimer TEXT NOT NULL,
    model_version VARCHAR(50) DEFAULT 'InvestMitra-DSPy-v1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. RESEARCH CITATIONS
CREATE TABLE IF NOT EXISTS research_citations (
    citation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES research_reports(report_id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(chunk_id) ON DELETE CASCADE,
    citation_text TEXT NOT NULL,
    relevance_score NUMERIC(3,2)
);
