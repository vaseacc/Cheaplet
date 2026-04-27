export default {
  async onRequest() {
    return new Response("Hello from Cloudflare Functions!");
  }
};
