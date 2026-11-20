FROM nginx:alpine

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

COPY index.html style.css app.js aktivitas_data.js user_sheet_live.csv manifest.json sw.js ./
COPY icons ./icons

EXPOSE 80
