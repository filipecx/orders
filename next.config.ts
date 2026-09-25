import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  //usa só os arquivos necessários pra reduzir a imagem
  output: 'standalone',
  // Permite conexões de recursos de desenvolvimento do Next.js via celular / IP local
  allowedDevOrigins: [
    '192.168.0.142',
    '192.168.0.*',
    '192.168.*',
    '10.*',
    '172.*',
    'localhost',
    '127.0.0.1',
    '*.local',
    '*.home',
  ],

  // Permite que Server Actions sejam disparadas a partir de conexões de IP local (ex: celular no mesmo Wi-Fi)
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        '192.168.0.142:3000',
        '192.168.0.*:3000',
        '192.168.*:3000',
        '10.*:3000',
        '172.*:3000',
        '*.local:3000',
        '*.home:3000',
      ],
    },
  },
};

export default nextConfig;
