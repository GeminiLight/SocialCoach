#!/usr/bin/env bash
# 在新买的机器上跑一次，确认它能撑起这个部署。
# 用法：  KEY=你的GLM密钥 bash check-host.sh
set -u
BASE="${LLM_BASE_URL:-https://open.bigmodel.cn/api/coding/paas/v4}"
MODEL="${LLM_FAST_MODEL:-glm-5.3-flash}"
ok(){ printf "  \033[32m✓\033[0m %s\n" "$*"; }
no(){ printf "  \033[31m✗\033[0m %s\n" "$*"; }

echo "── 机器 ──"
mem=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')
[ -n "${mem:-}" ] && { [ "$mem" -ge 1900 ] && ok "内存 ${mem}MB" || no "内存 ${mem}MB —— 不足 2GB，构建会 OOM（改为本地构建后推镜像）"; }
command -v docker >/dev/null && ok "docker $(docker --version | awk '{print $3}' | tr -d ,)" || no "没装 docker：curl -fsSL https://get.docker.com | sh"

echo "── 到模型端点（这条最关键）──"
for i in 1 2 3; do
  t=$( { /usr/bin/time -f %e curl -s -o /dev/null -m 20 -X POST "$BASE/chat/completions" \
        -H "Authorization: Bearer ${KEY:-}" -H 'content-type: application/json' \
        -d "{\"model\":\"$MODEL\",\"max_tokens\":64,\"messages\":[{\"role\":\"user\",\"content\":\"说 ok\"}]}" ; } 2>&1 )
  echo "  第 $i 次往返：${t}s"
done
code=$(curl -s -o /tmp/_r -m 20 -w '%{http_code}' -X POST "$BASE/chat/completions" \
  -H "Authorization: Bearer ${KEY:-}" -H 'content-type: application/json' \
  -d "{\"model\":\"$MODEL\",\"max_tokens\":64,\"messages\":[{\"role\":\"user\",\"content\":\"说 ok\"}]}")
[ "$code" = 200 ] && ok "模型可达，HTTP 200" || no "模型不可达，HTTP $code：$(head -c 120 /tmp/_r)"

echo "── 到海外模型（想让海外用户也能用默认 key 才需要）──"
for h in api.anthropic.com api.openai.com; do
  c=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "https://$h/v1/models")
  [ "$c" != 000 ] && ok "$h 可连通（HTTP $c，401 属正常）" || no "$h 连不上"
done

echo "── 端口 ──"
for p in 80 443; do
  (echo >/dev/tcp/127.0.0.1/$p) 2>/dev/null && no "本机 $p 已被占用" || ok "$p 空闲"
done
echo "  记得在阿里云安全组放行 80 / 443"
