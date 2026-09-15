"""Corrección de color de las fotos del sitio, sólo con PIL.

Se usó el 15/9/2026 sobre las tres fotos de la tira de la clase
(img-clase-masa, img-clase-plating, img-clase-postre): son fotos de teléfono
con luz mezclada, tenían el negro levantado (3, 7 y 17 sobre 255) y los
blancos de la mesa tirando a amarillo. Las cuatro del tapeo NO se tocaron:
tienen el negro en 0, ya están graduadas, y su calidez es la de la noche.

  python3 scripts/corregir-color.py foto.jpg salida.jpg 88


No es un filtro: cada ajuste se calcula desde la propia foto y va con tope,
para que siga pareciendo la foto de una clase y no una imagen de catálogo.

1. Punto blanco. En el estudio hay luz mezclada y los blancos —la mesa, la
   pared— salen grises tirando a amarillo. Se mide la dominante del 2% más
   claro de cada canal y se neutraliza. Tope 6%: más que eso ya no es
   corregir una dominante, es cambiar la luz de la foto.
2. Punto negro. Se estira desde el percentil 0,5, con tope de 12 niveles.
3. Contraste con techo. Curva suave en los medios que se apaga por encima de
   200 y no toca nada arriba de 245: img-clase-postre ya tiene el fondo
   quemado y subirle contraste lo rompería.
4. Saturación +8%, sin mover el tono.
"""
import sys
from PIL import Image, ImageEnhance

TOPE_BLANCO = 0.06
TOPE_NEGRO = 12
CONTRASTE = 0.10
TECHO = 245.0
SATURACION = 1.08


def percentil(hist, p, total):
    """Nivel por debajo del cual queda el p% de los píxeles del canal."""
    objetivo = total * p / 100.0
    acum = 0
    for nivel, n in enumerate(hist):
        acum += n
        if acum >= objetivo:
            return nivel
    return 255


def media_claros(hist, total, porcentaje=2.0):
    """Promedio del `porcentaje`% más claro del canal."""
    objetivo = total * porcentaje / 100.0
    acum = 0
    suma = 0
    for nivel in range(255, -1, -1):
        n = hist[nivel]
        if n == 0:
            continue
        usar = min(n, objetivo - acum)
        suma += nivel * usar
        acum += usar
        if acum >= objetivo:
            break
    return suma / acum if acum else 255.0


def corregir(ruta_in, ruta_out, calidad=None):
    im = Image.open(ruta_in).convert('RGB')
    total = im.size[0] * im.size[1]
    hists = [im.getchannel(c).histogram() for c in 'RGB']

    # 1. punto blanco
    claros = [media_claros(h, total) for h in hists]
    objetivo = sum(claros) / 3.0
    escalas = [min(max(objetivo / max(c, 1.0), 1 - TOPE_BLANCO), 1 + TOPE_BLANCO)
               for c in claros]

    # 2. punto negro: el más bajo de los tres canales, para no teñir las sombras
    negro = min(min(percentil(h, 0.5, total) for h in hists), TOPE_NEGRO)

    lut = []
    for canal, escala in enumerate(escalas):
        tabla = []
        for v in range(256):
            x = v * escala
            if negro > 0:
                x = (x - negro) * (255.0 / (255.0 - negro))
            x = min(max(x, 0.0), 255.0)
            # 3. contraste con techo
            n = x / 255.0
            curva = (n + CONTRASTE * (n - 0.5) * (1 - abs(2 * n - 1))) * 255.0
            prot = min(max((x - 200.0) / (TECHO - 200.0), 0.0), 1.0)
            x = curva * (1 - prot) + x * prot
            tabla.append(int(round(min(max(x, 0.0), 255.0))))
        lut.extend(tabla)

    out = im.point(lut)
    out = ImageEnhance.Color(out).enhance(SATURACION)  # 4

    if ruta_out.endswith('.webp'):
        out.save(ruta_out, 'WEBP', quality=calidad or 82, method=6)
    else:
        out.save(ruta_out, 'JPEG', quality=calidad or 86, optimize=True, progressive=True)
    return escalas, negro


if __name__ == '__main__':
    e, n = corregir(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else None)
    print('  blanco R/G/B x%.3f %.3f %.3f · negro +%d' % (e[0], e[1], e[2], n))
