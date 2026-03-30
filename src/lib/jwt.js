import jwt from "jsonwebtoken";

const SECRET_KEY =
  process.env.JWT_SECRET || "sua_chave_secreta_super_segura_aqui";

export const generateToken = (user) => {
  return jwt.sign({ user }, SECRET_KEY, { expiresIn: "8h" });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
};
