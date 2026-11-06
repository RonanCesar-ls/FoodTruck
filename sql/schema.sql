PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS categoria (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE IF NOT EXISTS item_cardapio (
  id INTEGER PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES categoria(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos >= 0)
) STRICT;

INSERT INTO categoria (nome)
VALUES ('Bebidas'), ('Pratos'), ('Sobremesas')
ON CONFLICT (nome) DO NOTHING;

COMMIT;
