// Local UI fixture: proxy an existing app and drive recognition callbacks without audio.
// Run: node scripts/serve-speech-fixture.mjs http://127.0.0.1:4344 4350
import http from 'node:http';

const upstream = new URL(process.argv[2] || 'http://127.0.0.1:3000');
if (!['localhost', '127.0.0.1'].includes(upstream.hostname)) throw new Error('Fixture upstream must be local.');
const port = Number(process.argv[3] || 4350);

function installFixture() {
  let current;
  const show = () => {
    const output = document.querySelector('#speech-fixture output');
    if (output) output.textContent = current ? `start=${current.starts} stop=${current.stops} abort=${current.aborts} ${current.lang}` : 'No recognition session';
  };
  class FixtureRecognition {
    starts = 0; stops = 0; aborts = 0; parts = [];
    start() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- retain the controllable recognizer in this local fixture
      current = this; this.starts++;
      this.callbacks = { start: this.onstart, result: this.onresult, end: this.onend, error: this.onerror };
      show();
    }
    stop() { this.stops++; show(); }
    abort() { this.aborts++; show(); }
    result(text, final) {
      const parts = [...this.parts, { isFinal: final, 0: { transcript: text } }];
      if (final) this.parts = parts;
      this.callbacks.result?.({ results: parts }); show();
    }
  }
  window.SpeechRecognition = FixtureRecognition;
  window.webkitSpeechRecognition = FixtureRecognition;
  document.addEventListener('DOMContentLoaded', () => {
    const panel = document.createElement('details');
    panel.id = 'speech-fixture'; panel.open = true;
    panel.innerHTML = '<summary>语音回调测试 · 不使用麦克风</summary><label>模拟识别文本<input aria-label="模拟识别文本" value="我今天不喝酒。"></label><div><button type="button" data-action="start">模拟收音开始</button><button type="button" data-action="interim">模拟中间结果</button><button type="button" data-action="final">模拟确认结果</button><button type="button" data-action="end">模拟识别结束</button><button type="button" data-action="late">模拟迟到结果</button><button type="button" data-action="error">模拟网络错误</button><button type="button" data-action="narrow">模拟手机输入宽度</button><button type="button" data-action="wide">恢复输入宽度</button><button type="button" data-action="hide">隐藏测试工具</button></div><output>No recognition session</output>';
    panel.addEventListener('click', event => {
      const action = event.target.dataset.action;
      if (action === 'hide') { panel.hidden = true; return; }
      if (action === 'narrow' || action === 'wide') {
        const composer = document.querySelector('.reply-composer'), field = document.querySelector('#reply');
        if (composer && field) {
          composer.style.width = action === 'narrow' ? '358px' : '';
          field.style.fontSize = action === 'narrow' ? '16px' : '';
        }
        return;
      }
      if (!current || !action) return;
      const text = panel.querySelector('input').value;
      if (action === 'start') current.callbacks.start?.();
      if (action === 'interim') current.result(text, false);
      if (action === 'final') current.result(text, true);
      if (action === 'end') current.callbacks.end?.();
      if (action === 'late') current.callbacks.result?.({ results: [{ isFinal: true, 0: { transcript: '迟到的识别，不能覆盖编辑。' } }] });
      if (action === 'error') current.callbacks.error?.({ error: 'network' });
      show();
    });
    document.body.append(panel);
  });
}
const injection = `<script>(${installFixture.toString()})();</script>`;

http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = { ...req.headers, host: upstream.host, 'accept-encoding': 'identity' };
    const body = Buffer.concat(chunks);
    const response = await fetch(new URL(req.url, upstream), {
      method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
      redirect: 'manual',
    });
    const responseHeaders = Object.fromEntries(response.headers);
    delete responseHeaders['content-length']; delete responseHeaders['content-encoding']; delete responseHeaders['transfer-encoding'];
    responseHeaders['cache-control'] = 'no-store';
    const bytes = Buffer.from(await response.arrayBuffer());
    const html = responseHeaders['content-type']?.includes('text/html');
    res.writeHead(response.status, responseHeaders);
    res.end(html ? bytes.toString().replace('<head>', `<head>${injection}`) : bytes);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'text/plain' }); res.end(`Local fixture failed: ${error.message}`);
  }
}).listen(port, '127.0.0.1', () => process.stdout.write(`Speech fixture: http://127.0.0.1:${port}/3d\n`));
