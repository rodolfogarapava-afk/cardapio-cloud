# Cardápio Cloud — contexto e estado atual

Atualizado em 30 de julho de 2026.

## 1. Objetivo do sistema

O Cardápio Cloud está sendo desenvolvido como uma plataforma SaaS multiempresa para restaurantes. Cada estabelecimento possui uma operação independente, com seus próprios usuários, produtos, estoque, comandas, caixa, relatórios, assinatura e impressão.

O projeto possui duas frentes:

- atendimento presencial, usado por garçons e pelo caixa dentro da loja;
- cardápio público/delivery, acessado pelo consumidor através de um endereço exclusivo.

## 2. Tecnologias e hospedagem

- Interface: React, TypeScript, TanStack Router e Vite.
- Banco, autenticação, armazenamento e atualizações em tempo real: Supabase.
- Hospedagem principal preparada para Vercel e Sites.
- Repositório: `rodolfogarapava-afk/cardapio-cloud`.
- Impressão: agente Windows instalado no computador da loja e fila isolada no Supabase.

Variáveis necessárias na hospedagem:

```env
VITE_SUPABASE_URL=URL_DO_PROJETO
VITE_SUPABASE_PUBLISHABLE_KEY=CHAVE_PUBLICA
```

As chaves não devem ser gravadas neste documento ou enviadas ao repositório.

## 3. Rotas existentes

### `/admin`

Área do administrador da plataforma. Permite:

- cadastrar uma nova loja e criar seu usuário de acesso;
- editar nome, responsável, plano, mensalidade e vencimento;
- editar e-mail e senha de acesso da loja;
- bloquear, reativar e excluir contas;
- acessar temporariamente a operação de uma loja;
- acompanhar assinaturas e situação dos clientes;
- visualizar o estado dos agentes de impressão;
- ativar ou desativar o cardápio público/delivery;
- definir o endereço exclusivo do cardápio.

### `/cliente`

Área autenticada da loja, utilizada na operação presencial. Contém:

- cardápio interno;
- comandas;
- cadastro e edição de categorias;
- cadastro e edição de produtos;
- estoque;
- caixa;
- relatórios;
- assinatura;
- central de impressão;
- saída da conta.

### `/cardapio`

Prévia autenticada do cardápio da loja conectada. Foi criada separadamente para que novas funções de delivery sejam desenvolvidas sem interferir no sistema presencial.

### `/cardapio/$slug`

Cardápio público de uma loja específica, sem necessidade de login.

Exemplo atualmente ativado:

```text
/cardapio/proveu-espeto
```

O endereço consulta o `slug` no Supabase, identifica o `tenant_id` e carrega somente nome, categorias e produtos daquela empresa.

## 4. Isolamento entre empresas

Todas as informações operacionais são vinculadas ao `tenant_id`.

Isso separa:

- usuários e permissões;
- categorias e produtos;
- estoque;
- comandas;
- vendas;
- despesas;
- caixa;
- relatórios;
- filas e agentes de impressão.

O cardápio público utiliza uma função controlada chamada `get_public_menu`. Ela não libera leitura direta das informações administrativas da tabela de lojas.

Uma loja bloqueada não deve conseguir operar normalmente. O cardápio público só responde para assinaturas nos estados `active`, `trial` ou `past_due`.

## 5. Cadastro e edição de lojas

Na criação e edição da loja existe a opção:

```text
Ativar delivery e cardápio público
```

Quando desativada:

- a loja continua usando normalmente o atendimento presencial em `/cliente`;
- o endereço público não retorna o cardápio.

Quando ativada:

- o administrador escolhe um endereço como `proveu-espeto`;
- o link passa a ser `/cardapio/proveu-espeto`;
- o endereço deve ser único;
- somente o catálogo da loja correspondente é carregado.

A loja **Deus Proveu Espetos** foi ativada com o slug `proveu-espeto`. As demais lojas permanecem desativadas até serem habilitadas individualmente.

## 6. Produtos e catálogo

O catálogo já oferece:

- categorias independentes por loja;
- cadastro, edição e exclusão de produtos;
- confirmação antes de excluir um produto;
- nome, preço, descrição e badge;
- imagem por URL;
- envio de imagem local para o Supabase Storage;
- controle opcional de estoque;
- quantidade atual e estoque mínimo;
- explicação visual do campo “Mínimo”;
- bloqueio de produto quando não existe categoria;
- sincronização do catálogo com o Supabase;
- catálogo inicial vazio para novas lojas.

### Ponto de preparo

Cada produto pode ativar a escolha do ponto:

- mal passado;
- ao ponto;
- bem passado.

Quando a opção estiver desligada, o produto é adicionado normalmente, sem perguntar o ponto.

## 7. Comandas e cozinha

O fluxo presencial já permite:

- adicionar produtos ao carrinho;
- informar mesa ou nome do cliente;
- salvar uma comanda;
- listar comandas separadas por etapa;
- mover pedidos entre novos, preparando e prontos;
- editar itens de uma comanda;
- registrar alterações;
- cancelar e voltar alterações sem atrasos artificiais;
- cobrar e finalizar o pagamento;
- reimprimir pedido;
- imprimir alterações;
- imprimir comprovante final.

Os pedidos são sincronizados por empresa. Uma comanda da Loja A não deve aparecer nem imprimir na Loja B.

## 8. Caixa e relatórios

Cada empresa possui caixa e relatórios próprios.

O sistema registra:

- vendas finalizadas;
- forma de pagamento;
- entradas;
- despesas;
- saldo;
- produtos mais vendidos;
- ticket médio;
- margem;
- itens vendidos;
- comandas pendentes;
- períodos de hoje, 7 dias, 30 dias, mês atual e personalizado;
- exportação de caixa em CSV;
- relatório em PDF.

Uma nova conta começa sem produtos, estoque, comandas, vendas ou despesas.

## 9. Impressão automática

O telefone não imprime diretamente na impressora USB. O fluxo projetado é:

1. o garçom registra o pedido no telefone;
2. o pedido é salvo no Supabase com o `tenant_id`;
3. o notebook da mesma loja executa o agente Windows;
4. o agente recebe somente os trabalhos daquela empresa;
5. a impressora USB/KNUP imprime a comanda;
6. o agente confirma o resultado no Supabase.

O sistema possui:

- geração de código de ativação;
- vínculo do agente com uma única loja;
- heartbeat para indicar se o agente está online;
- fila de impressão por `tenant_id`;
- proteção contra retirada do trabalho por outra empresa;
- estados pendente, processando, impresso e falhou;
- impressão de teste;
- fila para pedido, alteração e recibo.

O agente permanece instalado no computador. Depois da ativação inicial, não é necessário informar o código diariamente.

## 10. Supabase aplicado

Os scripts estão na pasta `supabase/`.

Principais estruturas:

- `schema.sql`: lojas, perfis e vínculos;
- `catalogs.sql`: catálogo de cada empresa;
- `operations.sql`: comandas, vendas e despesas;
- `product_images_storage.sql`: imagens de produtos;
- `print_queue.sql`: agentes e trabalhos de impressão;
- `client_access.sql`: administração de login e senha;
- `delivery.sql`: ativação e leitura segura do cardápio público.

Em 30/07/2026 foi aplicada ao banco a coluna:

```sql
delivery_enabled boolean not null default false
```

Também foi criada a função:

```sql
public.get_public_menu(p_slug text)
```

O cache da API do Supabase foi recarregado após a criação.

## 11. Estado atual do delivery

Já funciona:

- habilitar delivery individualmente no `/admin`;
- definir o slug;
- abrir o cardápio público sem login;
- carregar marca, categorias, produtos, preços, imagens e estoque da loja correta;
- utilizar o carrinho e a escolha de ponto de preparo;
- impedir que lojas não habilitadas sejam encontradas pela rota pública.

Ainda não foi concluído:

- tela de identificação do consumidor;
- endereço e referência da entrega;
- retirada no balcão;
- bairros e áreas atendidas;
- taxa de entrega;
- pedido mínimo;
- horários de funcionamento;
- escolha de pagamento no pedido público;
- cálculo do total com entrega;
- gravação do pedido público no Supabase;
- entrada automática do delivery no quadro de comandas;
- impressão automática do pedido de delivery;
- acompanhamento público do status;
- cancelamento pelo consumidor;
- integração com entregadores;
- WhatsApp e notificações;
- PWA instalável.

Importante: neste ponto, o cardápio público está pronto para navegação e montagem do carrinho, mas o checkout de delivery ainda será a próxima etapa. O fluxo presencial de comandas continua separado e funcionando.

## 12. Próxima etapa recomendada

Criar o checkout público na seguinte ordem:

1. escolher entrega ou retirada;
2. informar nome e telefone;
3. informar endereço somente quando for entrega;
4. configurar taxa, bairros e pedido mínimo por loja;
5. escolher a forma de pagamento;
6. confirmar o pedido;
7. gravar o pedido com `tenant_id` e um identificador público;
8. mostrar o pedido imediatamente em “Novos” no computador da loja;
9. adicionar o trabalho à fila de impressão daquela empresa;
10. exibir ao consumidor os estados recebido, aceito, preparando, saiu para entrega e concluído.

Antes de operar com muitas lojas, também é recomendado substituir a consulta frequente do agente de impressão por aviso em tempo real, mantendo uma consulta periódica mais lenta apenas como segurança.

## 13. Cuidados para as próximas alterações

- Nunca consultar produtos, comandas ou impressão sem filtrar pelo `tenant_id`.
- Nunca tornar as tabelas administrativas públicas.
- Usar funções controladas para operações anônimas do delivery.
- Não colocar chaves privadas ou `service_role` no navegador.
- Preservar o design e as funções atuais da rota `/cliente`.
- Desenvolver o delivery na rota `/cardapio/$slug`.
- Garantir idempotência na impressão para evitar pedidos duplicados.
- Testar sempre com duas empresas diferentes antes de publicar mudanças multiempresa.

