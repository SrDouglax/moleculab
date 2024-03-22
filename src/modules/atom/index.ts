import { Vector2 } from "../physics/vector";
import { Bond } from "./bond";
import { Element, elements } from "./elements";
import { Isotope } from "./isotope";

interface AtomProperties {
  atomicNumber?: number; // Número atômico
  atomicMass?: number; // Massa atômica
  symbol?: string; // Símbolo químico
  electronConfiguration?: string; // Configuração eletrônica
  atomicRadius?: number; // Raio atômico
  electronegativity?: number; // Eletronegatividade
  ionizationEnergy?: number; // Energia de ionização
  electronAffinity?: number; // Afinidade eletrônica
  oxidationState?: number; // Estado de oxidação
  protons?: number; // Número de prótons
  neutrons?: number; // Número de nêutrons
  electrons?: number; // Número de elétrons
  isotopes?: Isotope[];
}

interface AtomConfig {
  pos?: Vector2;
  vel?: Vector2;
  size?: number;
  id?: string;
  friction?: number;
  properties?: AtomProperties;
}
export class Atom {
  pos: Vector2;
  vel: Vector2;
  selected: boolean;
  size: number;
  id: string;
  friction: number;
  properties: AtomProperties;

  constructor(config?: AtomConfig) {
    this.pos = config?.pos || new Vector2(0, 0);
    this.vel = config?.vel || new Vector2(0, 0);
    this.selected = false;
    this.size = config?.size || 25;
    this.id = config?.id || this.generateUniqueID();
    this.friction = config?.friction || 1;
    this.properties = config?.properties || {};

    this.size += (this.properties.atomicMass || 1) ** 1.2 / 10;
  }

  getAnimatedSize() {
    return this.size * (1 + Math.min(this.vel.length(), this.size * 2) / (this.size * 10));
  }

  draw(ctx: CanvasRenderingContext2D, selected: boolean) {
    const styles = this.getStyle();
    const borderSpacing = selected ? 5 : 0; // Define o espaçamento da borda quando o átomo está selecionado
    const radius = this.getAnimatedSize();

    // Desenha o círculo representando o átomo com espaçamento de borda
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, radius + borderSpacing, 0, Math.PI * 2);
    ctx.fillStyle = "transparent"; // Define a cor de preenchimento como transparente para que apenas a borda seja desenhada
    ctx.lineWidth = 3; // Define a largura da borda
    ctx.strokeStyle = selected ? "white" : `hsl(${(this.properties.atomicNumber || 0) * 137.508}, 50%, 50%)`;
    ctx.stroke();
    ctx.closePath();

    // Desenha o círculo interno representando o átomo
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${(this.properties.atomicNumber || 0) * 137.508}, 50%, 50%)`;
    ctx.fill();
    ctx.closePath();

    if (this.properties.symbol) {
      ctx.font = `${styles.symbolFontSize}px Arial`;
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText(this.properties.symbol, this.pos.x, this.pos.y + styles.symbolFontSize / 4 + 2);
    }
  }

  getStyle() {
    const styles = {
      color: "#0095DD", // Default color
      atomicNumberSize: 10,
      symbolFontSize: 24,
      atomicMassSize: 8,
    };

    if (this.properties.electronegativity) {
      const electronegativity = this.properties.electronegativity;
      if (electronegativity <= 1.0) {
        styles.color = "#74D77F"; // Low electronegativity - Green
      } else if (electronegativity <= 2.0) {
        styles.color = "#FFF176"; // Moderate electronegativity - Yellow
      } else {
        styles.color = "#FF7043"; // High electronegativity - Red
      }
    }

    if (this.properties.atomicNumber) {
      styles.atomicNumberSize = Math.max(8, Math.min(20, this.properties.atomicNumber / 10));
    }

    if (this.properties.atomicMass) {
      styles.atomicMassSize = Math.max(6, Math.min(14, this.properties.atomicMass / 40));
    }

    if (this.properties.symbol) {
      styles.symbolFontSize = Math.max(16, Math.min(32, styles.symbolFontSize + this.properties.symbol.length * 2));
    }

    return styles;
  }

  calcPosition(delta: number) {
    if (this.vel.length() < 0.00001) {
      this.vel = new Vector2(0, 0);
    } else {
      // Calcula a força de fricção proporcional à velocidade atual
      const frictionForce = this.vel.multi(-this.friction);

      // Atualiza a velocidade com a força de fricção aplicada
      this.vel = this.vel.sum(frictionForce.multi(delta * (1 / Math.log(this.properties.atomicMass || 2)) * 20));

      // Atualiza a posição com base na velocidade atual
      this.pos = this.pos.sum(this.vel.multi(delta * (1 / Math.log(this.properties.atomicMass || 2)) * 20));
    }
  }

  public isBondedWith(bonds: Bond[], otherAtom: Atom): boolean {
    // Verifica se há uma ligação entre dois átomos na lista de vínculos da simulação
    return bonds.some((bond) => (bond.atom1 === this && bond.atom2 === otherAtom) || (bond.atom1 === otherAtom && bond.atom2 === this));
  }

  private generateUniqueID(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5); // Adjust the length of random component as needed
    return timestamp + randomStr;
  }

  static calculateAngle(bonds: Bond[], atom1: Atom, atom2: Atom, atom3: Atom): number | null {
    // Verificar se os três átomos estão conectados
    const isConnected = atom1.isBondedWith(bonds, atom2) && atom2.isBondedWith(bonds, atom3) && atom3.isBondedWith(bonds, atom1);

    if (!isConnected) {
      return null;
    }

    // Calcular os vetores entre os átomos
    const vector1 = atom1.pos.sub(atom2.pos);
    const vector2 = atom3.pos.sub(atom2.pos);

    // Calcular o ângulo entre os vetores em radianos
    let angleInRadians = Math.atan2(vector2.y, vector2.x) - Math.atan2(vector1.y, vector1.x);

    // Normalizar o ângulo para o intervalo [0, 2π]
    if (angleInRadians < 0) {
      angleInRadians += 2 * Math.PI;
    }

    // Converter o ângulo de radianos para graus
    const angleInDegrees = angleInRadians * (180 / Math.PI);

    return angleInDegrees;
  }

  static generateRandomAtom(pos: Vector2): Atom {
    const possibleElements = elements as Element[];

    // Randomly pick an element from possibleElements
    const element = possibleElements[Math.floor(Math.random() * possibleElements.length)];

    // Return a new Atom instance with randomly generated position, velocity, and selected element properties
    return new Atom({
      pos: pos || new Vector2(Math.random() * 500, Math.random() * 500), // Random position on a 500x500 grid
      properties: {
        atomicNumber: element.number,
        atomicMass: element.weight,
        symbol: element.symbol,
      },
    });
  }
}