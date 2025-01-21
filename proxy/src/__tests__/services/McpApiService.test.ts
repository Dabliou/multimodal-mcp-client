import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpApiService } from "../../services/McpApiService.js";
import type { ServerConfig, TransformedMcpData } from "../../types/index.js";

describe("McpApiService", () => {
  let service: McpApiService;
  const baseUrl = "http://test-api.com";
  const apiKey = "test-api-key";

  // Mock global fetch
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    service = new McpApiService(baseUrl, apiKey);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor and getter", () => {
    it("should initialize with baseUrl and apiKey", () => {
      expect(service.baseUrl).toBe(baseUrl);
    });
  });

  describe("fetchMcpData", () => {
    it("should fetch MCP data successfully", async () => {
      const mockData: TransformedMcpData = {
        mcpServers: {
          test: {
            command: "test-command",
            args: ["--test"],
          },
        },
        available: { test: true },
        defaults: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await service.fetchMcpData();

      expect(mockFetch).toHaveBeenCalledWith(expect.any(URL), {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
      });
      expect(mockFetch.mock.calls[0][0].href).toBe(`${baseUrl}/v1/mcp`);
      expect(result).toEqual(mockData);
    });

    it("should handle fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(service.fetchMcpData()).rejects.toThrow(
        "API request failed"
      );
    });
  });

  describe("updateMcpConfig", () => {
    it("should update MCP config successfully", async () => {
      const mockConfig: TransformedMcpData = {
        mcpServers: {
          test: {
            command: "test-command",
            args: ["--test"],
          },
        },
        available: { test: true },
        defaults: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      });

      const result = await service.updateMcpConfig(mockConfig);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/v1/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(mockConfig),
      });
      expect(result).toEqual(mockConfig);
    });

    it("should handle update error", async () => {
      const mockConfig: TransformedMcpData = {
        mcpServers: {
          test: {
            command: "test-command",
            args: ["--test"],
          },
        },
        available: { test: true },
        defaults: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("Invalid config"),
      });

      await expect(service.updateMcpConfig(mockConfig)).rejects.toThrow(
        "Error POSTing to endpoint"
      );
    });
  });

  describe("transformServers", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should transform servers correctly", async () => {
      const inputServers: Record<string, ServerConfig> = {
        test1: {
          command: "original-command",
          args: ["--original"],
        },
        test2: {
          command: "another-command",
          args: ["--another"],
        },
      };

      const result = await service.transformServers(inputServers);

      expect(Object.keys(result)).toEqual(["test1", "test2"]);
      expect(result.test1).toEqual({
        command: "C:\\Program Files\\nodejs\\npx.cmd",
        args: ["-y", "test1"],
        env: { SYSTEMPROMPT_API_KEY: "test-api-key" },
        metadata: {
          icon: "solar:programming-line-duotone",
          color: "secondary",
          description: "test1 MCP server",
          serverType: "core",
        },
      });
    });

    it("should handle missing API key", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;
      const inputServers: Record<string, ServerConfig> = {
        test: {
          command: "test-command",
          args: ["--test"],
        },
      };

      const result = await service.transformServers(inputServers);
      expect(result.test.env?.SYSTEMPROMPT_API_KEY).toBe("");
    });
  });

  describe("fetchFromApi", () => {
    it("should handle custom request options", async () => {
      const mockData = { test: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const customOptions: RequestInit = {
        headers: {
          "Custom-Header": "test",
        },
        mode: "cors",
      };

      const result = await service.fetchFromApi("/test", customOptions);

      expect(mockFetch).toHaveBeenCalledWith(expect.any(URL), {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          "Custom-Header": "test",
        },
        mode: "cors",
      });
      expect(mockFetch.mock.calls[0][0].href).toBe(`${baseUrl}/test`);
      expect(result).toEqual(mockData);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(service.fetchFromApi("/test")).rejects.toThrow(
        "Network error"
      );
    });
  });
});
