-- =====================================================
-- SCHEMA DO BANCO DE DADOS SUPABASE - CAÍPO
-- =====================================================

-- Remover tabelas existentes (se houver)
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS important_dates CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Tabela de Tarefas (tasks)
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    assignee VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    subtasks JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Datas Importantes (important_dates)
CREATE TABLE important_dates (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Log de Atividades (activity_log)
CREATE TABLE activity_log (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100),
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Perfis (vinculada ao Auth do Supabase)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'Usuário',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS) - Modo desenvolvimento
-- =====================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Permitir tudo (ambiente dev, depois você pode restringir)
CREATE POLICY "Acesso total tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Acesso total dates" ON important_dates FOR ALL USING (true);
CREATE POLICY "Acesso total logs" ON activity_log FOR ALL USING (true);
CREATE POLICY "Acesso total profiles" ON profiles FOR ALL USING (true);