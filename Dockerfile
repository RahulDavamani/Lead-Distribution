FROM node:20

WORKDIR /app

ENV MODE="DEV"
ENV DATABASE_URL="sqlserver://xyzprodvm.westus.cloudapp.azure.com;Initial Catalog=bundle_root;User ID=cguuser;Password=vOkAdI9sIE;trustServerCertificate=true;connection_limit=10;pool_timeout=0"

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build-ws

EXPOSE 3000 8000

CMD ["npm", "run", "start-ws"]
