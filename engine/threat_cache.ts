
export class ThreatCache {
  private static blockedTokens: Set<string> = new Set();

  static add(token: string) {
    this.blockedTokens.add(token);
  }

  static has(token: string): boolean {
    return this.blockedTokens.has(token);
  }

  static clear() {
    this.blockedTokens.clear();
  }
}
