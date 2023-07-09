import tokenizeString, { Token } from "glsl-tokenizer/string";

class GlslToken {
  private tokens: Token[] = [];
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }
  replaceShaderInputs() {
    const { tokens } = this;
    const newTokens: Token[] = [];
    for (const t of tokens) {
      if (t.type === "preprocessor") {
        if (t.data.trim().startsWith("#define")) {
          t.data = t.data.replace(/iResolution/g, "resolution");
          t.data = t.data.replace(/iTime/g, "time");
          t.data = t.data.replace(/iMouse/g, "mouse");
        }
      } else if (t.type === "ident") {
        if (t.data === "iResolution") {
          t.data = "resolution";
        }
        if (t.data === "iTime") {
          t.data = "time";
        }
        if (t.data === "iMouse") {
          t.data = "mouse";
        }
      }
      newTokens.push(t);
    }
    this.tokens = newTokens;
    return this;
  }
  removeShaderInputs() {
    const { tokens } = this;
    const newTokens: Token[] = [];
    for (let i = 0, l = tokens.length; i < l; i++) {
      const t = tokens[i];
      if (t.type === "preprocessor") {
        const subTokens = t.data.trim().split(" ");
        if (subTokens[0] === "#define" && subTokens[1] === "time") {
          i += 1; // skip next `\n`
          continue;
        }
      }
      newTokens.push(t);
    }
    this.tokens = newTokens;
    return this;
  }
  replaceFragCoord() {
    const { tokens } = this;
    const newTokens: Token[] = [];
    for (const t of tokens) {
      if (t.type === "ident" && t.data === "fragCoord") {
        t.data = "gl_FragCoord";
      }
      newTokens.push(t);
    }
    this.tokens = newTokens;
    return this;
  }
  fixMainImage() {
    const { tokens } = this;
    const newTokens: Token[] = [];
    for (let i = 0, l = tokens.length; i < l; i++) {
      const t = tokens[i];
      if (t.type === "ident" && t.data === "mainImage") {
        t.data = "main";
        newTokens.push(t);
        // Forward loop until `(` appears
        for (let j = i + 1; j < l; j++) {
          const t = tokens[j];
          i = j;
          if (t.type === "operator" && t.data === "(") {
            break;
          }
          newTokens.push(t);
        }
        // Push `(`
        newTokens.push(tokens[i]);
        // Forward loop until `)` appears
        for (let j = i + 1; j < l; j++) {
          const t = tokens[j];
          i = j;
          if (t.type === "operator" && t.data === ")") {
            break;
          }
        }
        // Push `)`
        newTokens.push(tokens[i]);
      } else {
        newTokens.push(t);
      }
    }
    this.tokens = newTokens;
    return this;
  }
  removeEof() {
    const { tokens } = this;
    const newTokens: Token[] = [];
    for (const t of tokens) {
      if (t.type !== "eof") {
        newTokens.push(t);
      }
    }
    this.tokens = newTokens;
    return this;
  }
  toString() {
    const { tokens } = this;
    return tokens.map((t) => t.data).join("");
  }
}

export function convert(src: string): string {
  const HEADERS = `#version 150

out vec4 fragColor;
uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;
uniform vec3 spectrum;
uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D prevFrame;
uniform sampler2D prevPass;

`;
  const tokenString = tokenizeString(src);
  const tokensConverted = new GlslToken(tokenString)
    .replaceShaderInputs()
    .removeShaderInputs()
    .replaceFragCoord()
    .fixMainImage()
    .removeEof();
  const srcConverted = HEADERS + tokensConverted.toString();
  return srcConverted;
}