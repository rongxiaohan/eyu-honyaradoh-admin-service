# eyu-lx100boxsvr

聋协百宝箱项目部署文档

[TOC]

## 项目地址

```sh
git clone ssh://git@git.eyuai.com:51107/eyu-lx100boxsvr.git # http api
git clone ssh://git@git.eyuai.com:51107/eyu-lx100boxws.git # socket.io
```

## Development

### 安装依赖

```bash
npm i
```

### 创建资源文件夹

为了不污染项目，将静态资源文件放在别的目录下

```bash
mkdir -p /var/17002/upload
```

其中`/var/17002`为配置文件中`config.private.sourceBaseDirPath`的值，开发环境一般是复制`.env.example.js`文件重命名为`.env.js`文件，则使用`.env.js`文件中的`config.private.sourceBaseDirPath`的值，如遇到权限问题则使用给目录授权

```bash
# 一般遇到权限问题，都是非 root 用户导致
sudo chmod -R 777 /var/17002
```

### 使用 pm2 运行

```bash
cp .env.example.js .env.js
pm2 start server.js --name eyu-lx100boxsvr
```

默认为热更新，如需模拟生成环境，则将`server.js`中的代码注释关闭

```diff
- // process.env.NODE_ENV = "production";
+ process.env.NODE_ENV = "production";
```

### 配置 Nginx

静态资源由 Nginx 代理，不使用 egg-static，有以下两点好处

- 加快静态资源返回
- 减轻 egg 服务压力

**加快静态资源返回**：由 Nginx 直接代理，不需要再经过 egg 的路由器，减少了 egg 路由匹配时间已经 egg 读取文件的时间。

**减轻 egg 服务压力**：egg 单示例运行，即使是简单的查询数据库并组合数据的接口压测也只要 300+ 每秒，如果静态资源还经过 egg 服务，会加剧 egg 处理其他接口的压力。

```conf
# /etc/nginx/nginx.conf
# For more information on configuration, see:
#   * Official English Documentation: http://nginx.org/en/docs/
#   * Official Russian Documentation: http://nginx.org/ru/docs/

user root;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

# Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    client_max_body_size 100M;
    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Load modular configuration files from the /etc/nginx/conf.d directory.
    # See http://nginx.org/en/docs/ngx_core_module.html#include
    # for more information.

    # io 服务 
    upstream io_nodes {
        #ip_hash;
        server localhost:17003;
        server localhost:17005;
    }
    include /etc/nginx/conf.d/*.conf;

    server {
        listen 9000;
        #server_name eyuai.tpddns.cn:9000;
        # io 服务的 api 接口
        location /ioapi {
            proxy_pass http://io_nodes/ioapi;
        }

        # io 服务的 socket.io 接口
        location / {
            proxy_pass http://io_nodes;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_http_version 1.1;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $host;
        }

        # 静态资源文件
        location /upload {
            root /var/17002;
        }
        # api 服务
        location /api {
            proxy_pass http://localhost:17001/api;
        }
    }
}
```

外部访问地址为`ip:9000`

## Deploy

### 安装发布依赖

```bash
npm i
```

### 创建文件夹

```bash
mkdir -p /var/eyu-lx100boxsvr/upload
```

```bash
# 一般遇到权限问题，都是非 root 用户导致
sudo chmod -R 777 /var/eyu-lx100boxsvr
```

### 使用 pm2 部署

```bash
# 不需要 .env.js 文件
pm2 start server.pro.js --name eyu-lx100boxsvr --kill-timeout 5000
```

这里设置了 5 秒后再 kill 掉，当执行`pm2 reload eyu-lx100boxsvr`时，五秒内服务将不处理任何新请求，并处理完正在处理的请求，保证数据库数据完整。

不过这并不是好方案，最好的方案是先在 Nginx 中将服务停了，等 egg 处理完请求后，再使用`pm2 reload`来重载服务。

### Nginx

```conf
# /etc/nginx/nginx.conf
# For more information on configuration, see:
#   * Official English Documentation: http://nginx.org/en/docs/
#   * Official Russian Documentation: http://nginx.org/ru/docs/

user root;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

# Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    client_max_body_size 100M;
    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Load modular configuration files from the /etc/nginx/conf.d directory.
    # See http://nginx.org/en/docs/ngx_core_module.html#include
    # for more information.

    # io 服务 
    upstream io_nodes {
        #ip_hash;
        server localhost:17003;
        server localhost:17005;
    }
    include /etc/nginx/conf.d/*.conf;

    server {
        listen 9000;
        #server_name eyuai.tpddns.cn:9000;
        # io 服务的 api 接口
        location /ioapi {
            proxy_pass http://io_nodes/ioapi;
        }

        # io 服务的 socket.io 接口
        location / {
            proxy_pass http://io_nodes;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_http_version 1.1;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $host;
        }

        # 静态资源文件
        location /upload {
            root /var/eyu-lx100boxsvr;
        }
        # api 服务
        location /api {
            proxy_pass http://localhost:17001/api;
        }
    }
}
```

外部访问地址为`ip:9000`

## 改进方案

目前**听障护航**的项目有一个 api 服务，一个静态资源服务，一个 socket.io 服务，其中静态资源是通过 api 服务上传，读取是由 Nginx 负责。

后期如果需要将这三个服务分离到三个服务器，需要将 api 中的 upload 接口都分离成独立项目，与静态资源服务放在一起。

![gateway](docs/gateway.svg)