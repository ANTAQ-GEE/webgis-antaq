import json
import os
import time
from qgis.core import QgsProject

# Diretório base dos dados do WebGIS
PASTA_DADOS = r'C:/Users/wellington.evaristo/OneDrive - ANTAQ/Estudos/Transversais/Mapa_WEB/webgis_antaq/dados'

# Dicionário oficial de conversão de nomes
MAPEAMENTO = {
    'País.geojson': 'pais.geojson',
    'tis_poligonais_shp.geojson': 'tis_poligonais.geojson',
    'UF.geojson': 'uf.geojson',
    'Vias_Economicamente_Navegadas.geojson': (
        'vias_economicamente_navegadas.geojson'
    ),
    'Regioes.geojson': 'regioes.geojson',
    'states_legal_amazon.geojson': 'estados_amazonia_legal.geojson',
    'Linhas_Travessias.geojson': 'linhas_travessias.geojson',
    'Embarcacoes.geojson': 'embarcacoes.geojson',
    'manifesto_camadas': 'manifesto_camadas.json',
}


def liberar_bloqueios_qgis(caminho_pasta):
  """Percorre todas as camadas carregadas no QGIS e descarrega as que apontam

  para a pasta de dados, evitando o erro [WinError 32] de arquivo em uso.
  """
  pasta_normalizada = os.path.normpath(caminho_pasta).lower()
  camadas = list(QgsProject.instance().mapLayers().values())

  for camada in camadas:
    fonte = os.path.normpath(camada.source()).lower()
    if pasta_normalizada in fonte:
      print(f'[QGIS] Desvinculando camada bloqueada: {camada.name()}')
      QgsProject.instance().removeMapLayer(camada.id())


def padronizar_arquivos_locais(caminho_pasta, regras_renomeacao):
  """Executa a renomeação segura em dois passos (contornando a limitação de

  case-insensitivity do sistema de arquivos NTFS do Windows).
  """
  if not os.path.exists(caminho_pasta):
    print(f'[ERRO] Diretório inexistente: {caminho_pasta}')
    return

  arquivos_existentes = os.listdir(caminho_pasta)

  for nome_origem, nome_destino in regras_renomeacao.items():
    # Localiza o arquivo na pasta de forma tolerante a maiúsculas/minúsculas
    arquivo_real = next(
        (a for a in arquivos_existentes if a.lower() == nome_origem.lower()),
        None,
    )

    if not arquivo_real:
      continue

    caminho_antigo = os.path.join(caminho_pasta, arquivo_real)
    caminho_novo = os.path.join(caminho_pasta, nome_destino)

    if arquivo_real == nome_destino:
      print(f'[OK] Nome já padronizado: {nome_destino}')
      continue

    try:
      # Cria um nome temporário único para evitar choque de nomes no Windows
      caminho_temp = os.path.join(caminho_pasta, f'__tmp_ren_{nome_destino}')

      os.rename(caminho_antigo, caminho_temp)

      # Se o destino já existir no disco, substitui
      if os.path.exists(caminho_novo):
        os.remove(caminho_novo)

      os.rename(caminho_temp, caminho_novo)
      print(f'[SUCESSO] Atualizado: {arquivo_real} -> {nome_destino}')

    except PermissionError:
      print(
          f'[BLOQUEADO] O arquivo {arquivo_real} está sendo usado pelo OneDrive'
          ' ou navegador.'
      )
    except Exception as e:
      print(f'[FALHA] Erro ao renomear {arquivo_real}: {e}')


# Execução do pipeline
print('--- INICIANDO PIPELINE DE NORMALIZAÇÃO ---')
liberar_bloqueios_qgis(PASTA_DADOS)
time.sleep(0.5)  # Pequeno intervalo para o sistema operacional desalocar memória
padronizar_arquivos_locais(PASTA_DADOS, MAPEAMENTO)
print('--- PIPELINE CONCLUÍDO COM SUCESSO ---')
