# Como Usar Fontes Bitmap

Este documento explica como carregar e usar fontes bitmap no Banana Vision para personalizar a aparência do texto no preview.

## O que são Fontes Bitmap?

Fontes bitmap são coleções de imagens (geralmente em um único arquivo de imagem, como um spritesheet) onde cada caractere é representado por um conjunto fixo de pixels. Diferente das fontes vetoriais, elas não podem ser redimensionadas infinitamente sem perda de qualidade, mas são úteis para estilos de texto específicos, como em jogos retrô ou interfaces estilizadas.

## Preparando sua Fonte Bitmap

Você precisará de um arquivo de imagem (PNG, JPG, etc.) contendo todos os caracteres que deseja usar. Os caracteres devem estar dispostos em uma grade uniforme. Certifique-se de que haja um espaçamento consistente entre os caracteres, se necessário.

## Carregando a Fonte Bitmap

1.  Na seção **Settings** (Configurações) da interface, procure pela opção relacionada a **Font** (Fonte).
2.  Clique no botão **Upload Font** (Carregar Fonte).
3.  Selecione o arquivo de imagem da sua fonte bitmap.

O Banana Vision tentará carregar a imagem como uma fonte. Para que isso funcione corretamente, a imagem será tratada como um spritesheet de caracteres.

## Configurando a Fonte Bitmap

Após carregar a imagem, você precisará configurar como o Banana Vision deve interpretar o spritesheet:

1.  **Tile Size (Tamanho do Tile):** Defina a largura e altura de cada caractere individual na imagem. Isso geralmente é especificado em pixels (ex: 8x8, 16x16).
2.  **Spacing (Espaçamento):** Se houver espaço entre os caracteres na sua imagem, você pode precisar ajustar as configurações de espaçamento horizontal e vertical para que o Banana Vision recorte os caracteres corretamente.
3.  **Character Mapping (Mapeamento de Caracteres):** (Se aplicável) Algumas implementações podem exigir que você defina qual caractere do teclado corresponde a qual tile na imagem. Verifique as opções disponíveis nas configurações.

## Visualizando no Preview

Uma vez que a fonte bitmap esteja carregada e configurada corretamente, o texto no painel **Text Preview** (Preview de Texto) deverá ser renderizado usando a fonte bitmap. Ajuste as configurações de tamanho do tile e espaçamento conforme necessário até que os caracteres apareçam corretamente.

## Dicas:

*   Use imagens com fundo transparente (PNG) para melhores resultados.
*   Comece com um spritesheet simples para entender como as configurações de tamanho do tile e espaçamento funcionam.
*   Se o texto parecer distorcido ou incorreto, verifique se o tamanho do tile e o espaçamento correspondem exatamente à sua imagem de fonte bitmap.

Com a fonte bitmap configurada, você pode dar um visual único e estilizado ao seu texto!