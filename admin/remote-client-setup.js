"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const SYSTEMD_SERVICE_NAME = 'iobroker-ds18b20-remote.service';
const files = {
    'common.js': 'InVzZSBzdHJpY3QiOwpPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgIl9fZXNNb2R1bGUiLCB7IHZhbHVlOiB0cnVlIH0pOwpleHBvcnRzLmRlY3J5cHQgPSBleHBvcnRzLmVuY3J5cHQgPSBleHBvcnRzLlJFTU9URV9QUk9UT0NPTF9WRVJTSU9OID0gdm9pZCAwOwpjb25zdCBjcnlwdG8gPSByZXF1aXJlKCJjcnlwdG8iKTsKZXhwb3J0cy5SRU1PVEVfUFJPVE9DT0xfVkVSU0lPTiA9IDI7CmNvbnN0IElWX0xFTkdUSCA9IDE2OwpmdW5jdGlvbiBlbmNyeXB0KHRleHQsIGtleSkgewogICAgY29uc3QgaXYgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoSVZfTEVOR1RIKTsKICAgIGNvbnN0IGNpcGhlciA9IGNyeXB0by5jcmVhdGVDaXBoZXJpdignYWVzLTI1Ni1jYmMnLCBrZXksIGl2KTsKICAgIGxldCBlbmNyeXB0ZWQgPSBjaXBoZXIudXBkYXRlKHRleHQpOwogICAgZW5jcnlwdGVkID0gQnVmZmVyLmNvbmNhdChbZW5jcnlwdGVkLCBjaXBoZXIuZmluYWwoKV0pOwogICAgcmV0dXJuIGl2LnRvU3RyaW5nKCdoZXgnKSArICc6JyArIGVuY3J5cHRlZC50b1N0cmluZygnaGV4Jyk7Cn0KZXhwb3J0cy5lbmNyeXB0ID0gZW5jcnlwdDsKZnVuY3Rpb24gZGVjcnlwdCh0ZXh0LCBrZXkpIHsKICAgIGNvbnN0IHRleHRQYXJ0cyA9IHRleHQuc3BsaXQoJzonKTsKICAgIGNvbnN0IGl2ID0gQnVmZmVyLmZyb20odGV4dFBhcnRzLnNoaWZ0KCksICdoZXgnKTsKICAgIGNvbnN0IGVuY3J5cHRlZFRleHQgPSBCdWZmZXIuZnJvbSh0ZXh0UGFydHMuam9pbignOicpLCAnaGV4Jyk7CiAgICBjb25zdCBkZWNpcGhlciA9IGNyeXB0by5jcmVhdGVEZWNpcGhlcml2KCdhZXMtMjU2LWNiYycsIGtleSwgaXYpOwogICAgbGV0IGRlY3J5cHRlZCA9IGRlY2lwaGVyLnVwZGF0ZShlbmNyeXB0ZWRUZXh0KTsKICAgIGRlY3J5cHRlZCA9IEJ1ZmZlci5jb25jYXQoW2RlY3J5cHRlZCwgZGVjaXBoZXIuZmluYWwoKV0pOwogICAgcmV0dXJuIGRlY3J5cHRlZC50b1N0cmluZygpOwp9CmV4cG9ydHMuZGVjcnlwdCA9IGRlY3J5cHQ7Ci8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaVkyOXRiVzl1TG1weklpd2ljMjkxY21ObFVtOXZkQ0k2SWlJc0luTnZkWEpqWlhNaU9sc2lMaTR2TGk0dmMzSmpMM0psYlc5MFpTOWpiMjF0YjI0dWRITWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklqczdPMEZCU1VFc2FVTkJRV2xETzBGQlRYQkNMRkZCUVVFc2RVSkJRWFZDTEVkQlFVY3NRMEZCUXl4RFFVRkRPMEZCVFhwRExFMUJRVTBzVTBGQlV5eEhRVUZITEVWQlFVVXNRMEZCUXp0QlFWRnlRaXhUUVVGblFpeFBRVUZQTEVOQlFVVXNTVUZCZFVJc1JVRkJSU3hIUVVGWE8wbEJRek5FTEUxQlFVMHNSVUZCUlN4SFFVRkhMRTFCUVUwc1EwRkJReXhYUVVGWExFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdTVUZEZWtNc1RVRkJUU3hOUVVGTkxFZEJRVWNzVFVGQlRTeERRVUZETEdOQlFXTXNRMEZCUXl4aFFVRmhMRVZCUVVVc1IwRkJSeXhGUVVGRkxFVkJRVVVzUTBGQlF5eERRVUZETzBsQlF6ZEVMRWxCUVVrc1UwRkJVeXhIUVVGSExFMUJRVTBzUTBGQlF5eE5RVUZOTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1NVRkZjRU1zVTBGQlV5eEhRVUZITEUxQlFVMHNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJSU3hUUVVGVExFVkJRVVVzVFVGQlRTeERRVUZETEV0QlFVc3NSVUZCUlN4RFFVRkZMRU5CUVVNc1EwRkJRenRKUVVWNlJDeFBRVUZQTEVWQlFVVXNRMEZCUXl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUjBGQlJ5eEhRVUZITEZOQlFWTXNRMEZCUXl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFTkJRVU03UVVGRE9VUXNRMEZCUXp0QlFWSkVMREJDUVZGRE8wRkJVVVFzVTBGQlowSXNUMEZCVHl4RFFVRkZMRWxCUVZrc1JVRkJSU3hIUVVGWE8wbEJRMmhFTEUxQlFVMHNVMEZCVXl4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdTVUZEYkVNc1RVRkJUU3hGUVVGRkxFZEJRVWNzVFVGQlRTeERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1MwRkJTeXhGUVVGWkxFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTTdTVUZETTBRc1RVRkJUU3hoUVVGaExFZEJRVWNzVFVGQlRTeERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEV0QlFVc3NRMEZCUXl4RFFVRkRPMGxCUXpsRUxFMUJRVTBzVVVGQlVTeEhRVUZITEUxQlFVMHNRMEZCUXl4blFrRkJaMElzUTBGQlF5eGhRVUZoTEVWQlFVVXNSMEZCUnl4RlFVRkZMRVZCUVVVc1EwRkJReXhEUVVGRE8wbEJRMnBGTEVsQlFVa3NVMEZCVXl4SFFVRkhMRkZCUVZFc1EwRkJReXhOUVVGTkxFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTTdTVUZGTDBNc1UwRkJVeXhIUVVGSExFMUJRVTBzUTBGQlF5eE5RVUZOTEVOQlFVTXNRMEZCUlN4VFFVRlRMRVZCUVVVc1VVRkJVU3hEUVVGRExFdEJRVXNzUlVGQlJTeERRVUZGTEVOQlFVTXNRMEZCUXp0SlFVVXpSQ3hQUVVGUExGTkJRVk1zUTBGQlF5eFJRVUZSTEVWQlFVVXNRMEZCUXp0QlFVTTVRaXhEUVVGRE8wRkJWa1FzTUVKQlZVTWlmUT09',
'ds18b20-remote-client.js': 'InVzZSBzdHJpY3QiOwp2YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHsKICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfQogICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7CiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfQogICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yWyJ0aHJvdyJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH0KICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfQogICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTsKICAgIH0pOwp9OwpPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgIl9fZXNNb2R1bGUiLCB7IHZhbHVlOiB0cnVlIH0pOwpjb25zdCB1dGlsXzEgPSByZXF1aXJlKCJ1dGlsIik7CmNvbnN0IG5ldF8xID0gcmVxdWlyZSgibmV0Iik7CmNvbnN0IGZzID0gcmVxdWlyZSgiZnMiKTsKY29uc3Qgb3MgPSByZXF1aXJlKCJvcyIpOwpjb25zdCByZWFkRGlyID0gKDAsIHV0aWxfMS5wcm9taXNpZnkpKGZzLnJlYWRkaXIpOwpjb25zdCByZWFkRmlsZSA9ICgwLCB1dGlsXzEucHJvbWlzaWZ5KShmcy5yZWFkRmlsZSk7CmNvbnN0IGxvZ2dlcl8xID0gcmVxdWlyZSgiLi9sb2dnZXIiKTsKY29uc3QgY29tbW9uXzEgPSByZXF1aXJlKCIuL2NvbW1vbiIpOwpjb25zdCBFTlZfS0VZUyA9IFsKICAgICdBREFQVEVSX0hPU1QnLAogICAgJ0FEQVBURVJfS0VZJywKICAgICdBREFQVEVSX1BPUlQnLAogICAgJ0RFQlVHJywKICAgICdTWVNURU1fSUQnLAogICAgJ1cxX0RFVklDRVNfUEFUSCcsCl07CmNsYXNzIERzMThiMjBSZW1vdGUgewogICAgY29uc3RydWN0b3IoKSB7CiAgICAgICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0ID0gbnVsbDsKICAgICAgICB0aGlzLnNob3VsZEV4aXQgPSBmYWxzZTsKICAgICAgICB0aGlzLnJlY3ZEYXRhID0gJyc7CiAgICAgICAgdGhpcy5jb25uZWN0ID0gdGhpcy5jb25uZWN0LmJpbmQodGhpcyk7CiAgICAgICAgdGhpcy5leGl0ID0gdGhpcy5leGl0LmJpbmQodGhpcyk7CiAgICAgICAgdGhpcy5vbkNsb3NlID0gdGhpcy5vbkNsb3NlLmJpbmQodGhpcyk7CiAgICAgICAgdGhpcy5vbkRhdGEgPSB0aGlzLm9uRGF0YS5iaW5kKHRoaXMpOwogICAgICAgIHRoaXMub25FcnJvciA9IHRoaXMub25FcnJvci5iaW5kKHRoaXMpOwogICAgICAgIHRoaXMub25Db25uZWN0ID0gdGhpcy5vbkNvbm5lY3QuYmluZCh0aGlzKTsKICAgICAgICB0aGlzLmxvZyA9IG5ldyBsb2dnZXJfMS5Mb2dnZXIoKTsKICAgICAgICB0aGlzLmxvZy5sb2coJy0gaW9Ccm9rZXIuZHMxOGIyMCByZW1vdGUgY2xpZW50IC0nKTsKICAgICAgICB0aGlzLnJlYWREb3RFbnYoKTsKICAgICAgICBpZiAocHJvY2Vzcy5lbnYuU1lTVEVNX0lEKSB7CiAgICAgICAgICAgIHRoaXMuc3lzdGVtSWQgPSBwcm9jZXNzLmVudi5TWVNURU1fSUQudHJpbSgpOwogICAgICAgIH0KICAgICAgICBlbHNlIHsKICAgICAgICAgICAgdGhpcy5zeXN0ZW1JZCA9IG9zLmhvc3RuYW1lKCk7CiAgICAgICAgICAgIHRoaXMubG9nLndhcm4oYFVzaW5nIHRoZSBob3N0bmFtZSAke3RoaXMuc3lzdGVtSWR9IGFzIHN5c3RlbSBJRC4gUGxlYXNlIHNldCBTWVNURU1fSUQgdG8gYSB1bmlxdWUgdmFsdWUuYCk7CiAgICAgICAgfQogICAgICAgIHRoaXMubG9nLmRlYnVnKGBzeXN0ZW1JZGAsIHRoaXMuc3lzdGVtSWQpOwogICAgICAgIGlmIChwcm9jZXNzLmVudi5BREFQVEVSX1BPUlQpIHsKICAgICAgICAgICAgdHJ5IHsKICAgICAgICAgICAgICAgIHRoaXMuYWRhcHRlclBvcnQgPSBwYXJzZUludChwcm9jZXNzLmVudi5BREFQVEVSX1BPUlQsIDEwKTsKICAgICAgICAgICAgfQogICAgICAgICAgICBjYXRjaCAoZXJyKSB7CiAgICAgICAgICAgICAgICB0aGlzLmxvZy5lcnJvcihgSW52YWxpZCBBREFQVEVSX1BPUlQhYCwgZXJyKTsKICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgxKTsKICAgICAgICAgICAgfQogICAgICAgIH0KICAgICAgICBlbHNlIHsKICAgICAgICAgICAgdGhpcy5hZGFwdGVyUG9ydCA9IDE4MjA7CiAgICAgICAgfQogICAgICAgIHRoaXMubG9nLmRlYnVnKGBhZGFwdGVyUG9ydGAsIHRoaXMuYWRhcHRlclBvcnQpOwogICAgICAgIHRoaXMuYWRhcHRlckhvc3QgPSAocHJvY2Vzcy5lbnYuQURBUFRFUl9IT1NUIHx8ICcnKS50cmltKCk7CiAgICAgICAgaWYgKHRoaXMuYWRhcHRlckhvc3QubGVuZ3RoIDw9IDApIHsKICAgICAgICAgICAgdGhpcy5sb2cuZXJyb3IoYE5vIEFEQVBURVJfSE9TVCBnaXZlbiFgKTsKICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDEpOwogICAgICAgIH0KICAgICAgICB0aGlzLmxvZy5kZWJ1ZyhgYWRhcHRlckhvc3RgLCB0aGlzLmFkYXB0ZXJIb3N0KTsKICAgICAgICB0aGlzLmFkYXB0ZXJLZXkgPSBCdWZmZXIuZnJvbShwcm9jZXNzLmVudi5BREFQVEVSX0tFWSB8fCAnJywgJ2hleCcpOwogICAgICAgIGlmICh0aGlzLmFkYXB0ZXJLZXkubGVuZ3RoICE9PSAzMikgewogICAgICAgICAgICB0aGlzLmxvZy5lcnJvcihgQURBUFRFUl9LRVkgaXMgbm8gdmFsaWQga2V5IWApOwogICAgICAgICAgICBwcm9jZXNzLmV4aXQoMSk7CiAgICAgICAgfQogICAgICAgIHRoaXMubG9nLmRlYnVnKGBhZGFwdGVyS2V5YCwgdGhpcy5hZGFwdGVyS2V5KTsKICAgICAgICB0aGlzLncxRGV2aWNlc1BhdGggPSBwcm9jZXNzLmVudi5XMV9ERVZJQ0VTX1BBVEggfHwgJy9zeXMvYnVzL3cxL2RldmljZXMnOwogICAgICAgIGlmICghZnMuZXhpc3RzU3luYyh0aGlzLncxRGV2aWNlc1BhdGgpKSB7CiAgICAgICAgICAgIHRoaXMubG9nLmVycm9yKGBUaGUgMS13aXJlIGRldmljZXMgcGF0aCAke3RoaXMudzFEZXZpY2VzUGF0aH0gZG9lcyBub3QgZXhpc3QhYCk7CiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgxKTsKICAgICAgICB9CiAgICAgICAgdGhpcy5sb2cuZGVidWcoYHcxRGV2aWNlc1BhdGhgLCB0aGlzLncxRGV2aWNlc1BhdGgpOwogICAgICAgIHByb2Nlc3Mub24oJ1NJR0lOVCcsIHRoaXMuZXhpdCk7CiAgICAgICAgcHJvY2Vzcy5vbignU0lHVEVSTScsIHRoaXMuZXhpdCk7CiAgICAgICAgdGhpcy5zb2NrZXQgPSBuZXcgbmV0XzEuU29ja2V0KCk7CiAgICAgICAgdGhpcy5zb2NrZXQub24oJ2Nsb3NlJywgdGhpcy5vbkNsb3NlKTsKICAgICAgICB0aGlzLnNvY2tldC5vbignZGF0YScsIHRoaXMub25EYXRhKTsKICAgICAgICB0aGlzLnNvY2tldC5vbignZXJyb3InLCB0aGlzLm9uRXJyb3IpOwogICAgICAgIHRoaXMuc29ja2V0Lm9uKCdjb25uZWN0JywgdGhpcy5vbkNvbm5lY3QpOwogICAgICAgIHRoaXMuY29ubmVjdCgpOwogICAgfQogICAgY29ubmVjdCgpIHsKICAgICAgICBpZiAodGhpcy5yZWNvbm5lY3RUaW1lb3V0KSB7CiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlY29ubmVjdFRpbWVvdXQpOwogICAgICAgICAgICB0aGlzLnJlY29ubmVjdFRpbWVvdXQgPSBudWxsOwogICAgICAgIH0KICAgICAgICBpZiAodGhpcy5zaG91bGRFeGl0KSB7CiAgICAgICAgICAgIHJldHVybjsKICAgICAgICB9CiAgICAgICAgdGhpcy5sb2cuaW5mbyhgQ29ubmVjdGluZyB0byAke3RoaXMuYWRhcHRlckhvc3R9OiR7dGhpcy5hZGFwdGVyUG9ydH0gLi4uYCk7CiAgICAgICAgdGhpcy5zb2NrZXQuY29ubmVjdCh7CiAgICAgICAgICAgIGhvc3Q6IHRoaXMuYWRhcHRlckhvc3QsCiAgICAgICAgICAgIHBvcnQ6IHRoaXMuYWRhcHRlclBvcnQsCiAgICAgICAgfSk7CiAgICB9CiAgICBvbkNvbm5lY3QoKSB7CiAgICAgICAgdGhpcy5sb2cuaW5mbyhgQ29ubmVjdGVkIHdpdGggYWRhcHRlcmApOwogICAgICAgIGlmICh0aGlzLnJlY29ubmVjdFRpbWVvdXQpIHsKICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVjb25uZWN0VGltZW91dCk7CiAgICAgICAgfQogICAgICAgIHRoaXMucmVjb25uZWN0VGltZW91dCA9IG51bGw7CiAgICB9CiAgICBvbkRhdGEoZGF0YSkgewogICAgICAgIHRoaXMucmVjdkRhdGEgKz0gZGF0YS50b1N0cmluZygpOwogICAgICAgIGxldCBpZHggPSB0aGlzLnJlY3ZEYXRhLmluZGV4T2YoJ1xuJyk7CiAgICAgICAgd2hpbGUgKGlkeCA+IDApIHsKICAgICAgICAgICAgY29uc3QgcmF3ID0gdGhpcy5yZWN2RGF0YS5zbGljZSgwLCBpZHgpOwogICAgICAgICAgICB0aGlzLnJlY3ZEYXRhID0gdGhpcy5yZWN2RGF0YS5zbGljZShpZHggKyAxKTsKICAgICAgICAgICAgdGhpcy5oYW5kbGVTb2NrZXREYXRhKHJhdyk7CiAgICAgICAgICAgIGlkeCA9IHRoaXMucmVjdkRhdGEuaW5kZXhPZignXG4nKTsKICAgICAgICB9CiAgICB9CiAgICBoYW5kbGVTb2NrZXREYXRhKHJhdykgewogICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7CiAgICAgICAgICAgIGxldCBkYXRhOwogICAgICAgICAgICB0cnkgewogICAgICAgICAgICAgICAgY29uc3QgZGF0YVN0ciA9ICgwLCBjb21tb25fMS5kZWNyeXB0KShyYXcsIHRoaXMuYWRhcHRlcktleSk7CiAgICAgICAgICAgICAgICBkYXRhID0gSlNPTi5wYXJzZShkYXRhU3RyKTsKICAgICAgICAgICAgfQogICAgICAgICAgICBjYXRjaCAoZXJyKSB7CiAgICAgICAgICAgICAgICB0aGlzLmxvZy53YXJuKGBEZWNyeXB0IG9mIGRhdGEgZmFpbGVkISAke2Vyci50b1N0cmluZygpfWApOwogICAgICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW5kKCk7CiAgICAgICAgICAgICAgICByZXR1cm47CiAgICAgICAgICAgIH0KICAgICAgICAgICAgdGhpcy5sb2cuZGVidWcoJ21lc3NhZ2UgZnJvbSBhZGFwdGVyOicsIGRhdGEpOwogICAgICAgICAgICBzd2l0Y2ggKGRhdGEuY21kKSB7CiAgICAgICAgICAgICAgICBjYXNlICdjbGllbnRJbmZvJzoKICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5wcm90b2NvbFZlcnNpb24gIT09IGNvbW1vbl8xLlJFTU9URV9QUk9UT0NPTF9WRVJTSU9OKSB7CiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9nLndhcm4oYFByb3RvY29sIHZlcnNpb24gJHtkYXRhLnByb3RvY29sVmVyc2lvbn0gZnJvbSB0aGUgYWRhcHRlciBkb2VzIG5vdCBtYXRjaCB0aGUgcmVtb3RlIGNsaWVudCBwcm90b2NvbCB2ZXJzaW9uICR7Y29tbW9uXzEuUkVNT1RFX1BST1RPQ09MX1ZFUlNJT059ISBQbGVhc2UgcmVpbnN0YWxsIHRoZSByZW1vdGUgY2xpZW50LmApOwogICAgICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZy5pbmZvKCdTZW5kaW5nIGNsaWVudCBpbmZvIHRvIHRoZSBhZGFwdGVyJyk7CiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kKHsKICAgICAgICAgICAgICAgICAgICAgICAgY21kOiAnY2xpZW50SW5mbycsCiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sVmVyc2lvbjogY29tbW9uXzEuUkVNT1RFX1BST1RPQ09MX1ZFUlNJT04sCiAgICAgICAgICAgICAgICAgICAgICAgIHN5c3RlbUlkOiB0aGlzLnN5c3RlbUlkLAogICAgICAgICAgICAgICAgICAgIH0pOwogICAgICAgICAgICAgICAgICAgIGJyZWFrOwogICAgICAgICAgICAgICAgY2FzZSAncmVhZCc6CiAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLmFkZHJlc3MpIHsKICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2cud2FybihgR290IHJlYWQgY29tbWFuZCB3aXRob3V0IGFkZHJlc3MgZnJvbSBhZGFwdGVyIWApOwogICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47CiAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgICAgIGxldCByYXc7CiAgICAgICAgICAgICAgICAgICAgdHJ5IHsKICAgICAgICAgICAgICAgICAgICAgICAgcmF3ID0geWllbGQgcmVhZEZpbGUoYCR7dGhpcy53MURldmljZXNQYXRofS8ke2RhdGEuYWRkcmVzc30vdzFfc2xhdmVgLCAndXRmOCcpOwogICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZy5kZWJ1ZyhgUmVhZCBmcm9tIGZpbGUgJHt0aGlzLncxRGV2aWNlc1BhdGh9LyR7ZGF0YS5hZGRyZXNzfS93MV9zbGF2ZTpgLCByYXcpOwogICAgICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7CiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9nLndhcm4oYFJlYWQgZnJvbSBmaWxlICR7dGhpcy53MURldmljZXNQYXRofS8ke2RhdGEuYWRkcmVzc30vdzFfc2xhdmUgZmFpbGVkISAke2Vyci50b1N0cmluZygpfWApOwogICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZy5kZWJ1ZyhlcnIpOwogICAgICAgICAgICAgICAgICAgICAgICByYXcgPSAnJzsKICAgICAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy5zZW5kKHsKICAgICAgICAgICAgICAgICAgICAgICAgY21kOiAncmVhZCcsCiAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6IGRhdGEuYWRkcmVzcywKICAgICAgICAgICAgICAgICAgICAgICAgdHM6IGRhdGEudHMsCiAgICAgICAgICAgICAgICAgICAgICAgIHJhdywKICAgICAgICAgICAgICAgICAgICB9KTsKICAgICAgICAgICAgICAgICAgICBicmVhazsKICAgICAgICAgICAgICAgIGNhc2UgJ3NlYXJjaCc6CiAgICAgICAgICAgICAgICAgICAgdHJ5IHsKICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSB5aWVsZCByZWFkRGlyKHRoaXMudzFEZXZpY2VzUGF0aCk7CiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21zID0gW107CiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsZXMubGVuZ3RoOyBpKyspIHsKICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmlsZXNbaV0ubWF0Y2goL153MV9idXNfbWFzdGVyXGQrJC8pKSB7CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7CiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZy5kZWJ1ZyhgcmVhZGluZyAke3RoaXMudzFEZXZpY2VzUGF0aH0vJHtmaWxlc1tpXX0vdzFfbWFzdGVyX3NsYXZlc2ApOwogICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXMucHVzaChyZWFkRmlsZShgJHt0aGlzLncxRGV2aWNlc1BhdGh9LyR7ZmlsZXNbaV19L3cxX21hc3Rlcl9zbGF2ZXNgLCAndXRmOCcpKTsKICAgICAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRyZXNzZXMgPSAoeWllbGQgUHJvbWlzZS5hbGwocHJvbXMpKS5yZWR1Y2UoKGFjYywgY3VyKSA9PiB7CiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2MucHVzaCguLi5jdXIudHJpbSgpLnNwbGl0KCdcbicpKTsKICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhY2M7CiAgICAgICAgICAgICAgICAgICAgICAgIH0sIFtdKTsKICAgICAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy5zZW5kKHsKICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNtZDogJ3NlYXJjaCcsCiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0czogZGF0YS50cywKICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN5c3RlbUlkOiBkYXRhLnN5c3RlbUlkLAogICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkcmVzc2VzCiAgICAgICAgICAgICAgICAgICAgICAgIH0pOwogICAgICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7CiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9nLndhcm4oYFNlYXJjaGluZyBmb3Igc2Vuc29ycyBmYWlsZWQhICR7ZXJyLnRvU3RyaW5nKCl9YCk7CiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9nLmRlYnVnKGVycik7CiAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgICAgIGJyZWFrOwogICAgICAgICAgICAgICAgZGVmYXVsdDoKICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZy53YXJuKGBVbmtub3duIGNvbW1hbmQgZnJvbSBhZGFwdGVyYCk7CiAgICAgICAgICAgIH0KICAgICAgICB9KTsKICAgIH0KICAgIG9uRXJyb3IoZXJyKSB7CiAgICAgICAgdGhpcy5sb2cud2FybihgU29ja2V0IGVycm9yOmAsIGVyci50b1N0cmluZygpKTsKICAgICAgICB0aGlzLmxvZy5kZWJ1ZyhlcnIpOwogICAgICAgIHRoaXMuc29ja2V0LmVuZCgpOwogICAgICAgIHRoaXMucmVjb25uZWN0KCk7CiAgICB9CiAgICBvbkNsb3NlKCkgewogICAgICAgIHRoaXMubG9nLmluZm8oJ1NvY2tldCBjbG9zZWQnKTsKICAgICAgICB0aGlzLnJlY29ubmVjdCgpOwogICAgfQogICAgcmVjb25uZWN0KCkgewogICAgICAgIGlmICghdGhpcy5yZWNvbm5lY3RUaW1lb3V0ICYmICF0aGlzLnNob3VsZEV4aXQpIHsKICAgICAgICAgICAgdGhpcy5sb2cuaW5mbyhgUmVjb25uZWN0IGluIDMwIHNlY29uZHNgKTsKICAgICAgICAgICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0ID0gc2V0VGltZW91dCh0aGlzLmNvbm5lY3QsIDMwMDAwKTsKICAgICAgICB9CiAgICB9CiAgICBzZW5kKGRhdGEpIHsKICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkgewogICAgICAgICAgICB0aGlzLmxvZy5kZWJ1Zygnc2VuZCB0byBhZGFwdGVyOicsIGRhdGEpOwogICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gewogICAgICAgICAgICAgICAgdGhpcy5zb2NrZXQud3JpdGUoKDAsIGNvbW1vbl8xLmVuY3J5cHQpKEpTT04uc3RyaW5naWZ5KGRhdGEpLCB0aGlzLmFkYXB0ZXJLZXkpICsgJ1xuJywgKGVycikgPT4gewogICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHsKICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7CiAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgICAgIGVsc2UgewogICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7CiAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgfSk7CiAgICAgICAgICAgIH0pOwogICAgICAgIH0pOwogICAgfQogICAgcmVhZERvdEVudigpIHsKICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoJy5lbnYnKSkKICAgICAgICAgICAgcmV0dXJuOwogICAgICAgIGxldCBkYXRhOwogICAgICAgIHRyeSB7CiAgICAgICAgICAgIGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoJy5lbnYnLCAndXRmLTgnKS5zcGxpdCgnXG4nKS5tYXAoKGwpID0+IGwudHJpbSgpKTsKICAgICAgICB9CiAgICAgICAgY2F0Y2ggKGVycikgewogICAgICAgICAgICB0aGlzLmxvZy5kZWJ1ZygnY2FuXCd0IHJlYWQgLmVudiBmaWxlJywgZXJyKTsKICAgICAgICAgICAgcmV0dXJuOwogICAgICAgIH0KICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgZGF0YSkgewogICAgICAgICAgICBpZiAoIWxpbmUgfHwgbGluZS5zdGFydHNXaXRoKCcjJykpCiAgICAgICAgICAgICAgICBjb250aW51ZTsKICAgICAgICAgICAgY29uc3QgaWR4ID0gbGluZS5pbmRleE9mKCc9Jyk7CiAgICAgICAgICAgIGlmIChpZHggPD0gMCkKICAgICAgICAgICAgICAgIGNvbnRpbnVlOwogICAgICAgICAgICBjb25zdCBrZXkgPSBsaW5lLnNsaWNlKDAsIGlkeCkudHJpbSgpOwogICAgICAgICAgICBjb25zdCB2YWwgPSBsaW5lLnNsaWNlKGlkeCArIDEpLnRyaW0oKS5yZXBsYWNlKC8oXiJ8IiQpL2csICcnKTsKICAgICAgICAgICAgaWYgKEVOVl9LRVlTLmluZGV4T2Yoa2V5KSA+PSAwKSB7CiAgICAgICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnZba2V5XSkKICAgICAgICAgICAgICAgICAgICBjb250aW51ZTsKICAgICAgICAgICAgICAgIHByb2Nlc3MuZW52W2tleV0gPSB2YWw7CiAgICAgICAgICAgICAgICB0aGlzLmxvZy5kZWJ1ZyhgcmVhZCAke2tleX09JHt2YWx9IGZyb20gLmVudiBmaWxlYCk7CiAgICAgICAgICAgIH0KICAgICAgICB9CiAgICB9CiAgICBleGl0KCkgewogICAgICAgIHRoaXMuc2hvdWxkRXhpdCA9IHRydWU7CiAgICAgICAgaWYgKHRoaXMucmVjb25uZWN0VGltZW91dCkgewogICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5yZWNvbm5lY3RUaW1lb3V0KTsKICAgICAgICB9CiAgICAgICAgdGhpcy5zb2NrZXQuZW5kKCk7CiAgICB9Cn0KbmV3IERzMThiMjBSZW1vdGUoKTsKLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pWkhNeE9HSXlNQzF5WlcxdmRHVXRZMnhwWlc1MExtcHpJaXdpYzI5MWNtTmxVbTl2ZENJNklpSXNJbk52ZFhKalpYTWlPbHNpTGk0dkxpNHZjM0pqTDNKbGJXOTBaUzlrY3pFNFlqSXdMWEpsYlc5MFpTMWpiR2xsYm5RdWRITWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklqczdPenM3T3pzN096czdRVUZuUWtFc0swSkJRV2xETzBGQlEycERMRFpDUVVFMlFqdEJRVU0zUWl4NVFrRkJlVUk3UVVGRGVrSXNlVUpCUVhsQ08wRkJSWHBDTEUxQlFVMHNUMEZCVHl4SFFVRkhMRWxCUVVFc1owSkJRVk1zUlVGQlF5eEZRVUZGTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1FVRkRkRU1zVFVGQlRTeFJRVUZSTEVkQlFVY3NTVUZCUVN4blFrRkJVeXhGUVVGRExFVkJRVVVzUTBGQlF5eFJRVUZSTEVOQlFVTXNRMEZCUXp0QlFVVjRReXh4UTBGQmEwTTdRVUZGYkVNc2NVTkJTV3RDTzBGQlMyeENMRTFCUVUwc1VVRkJVU3hIUVVGSE8wbEJRMllzWTBGQll6dEpRVU5rTEdGQlFXRTdTVUZEWWl4alFVRmpPMGxCUTJRc1QwRkJUenRKUVVOUUxGZEJRVmM3U1VGRFdDeHBRa0ZCYVVJN1EwRkRiRUlzUTBGQlF6dEJRVXRHTEUxQlFVMHNZVUZCWVR0SlFYbEVha0k3VVVGd1FsRXNjVUpCUVdkQ0xFZEJRVEJDTEVsQlFVa3NRMEZCUXp0UlFVMHZReXhsUVVGVkxFZEJRVmtzUzBGQlN5eERRVUZETzFGQlR6VkNMR0ZCUVZFc1IwRkJWeXhGUVVGRkxFTkJRVU03VVVGVE5VSXNTVUZCU1N4RFFVRkRMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRSUVVOMlF5eEpRVUZKTEVOQlFVTXNTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRPMUZCUTJwRExFbEJRVWtzUTBGQlF5eFBRVUZQTEVkQlFVY3NTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVOQlFVTTdVVUZEZGtNc1NVRkJTU3hEUVVGRExFMUJRVTBzUjBGQlJ5eEpRVUZKTEVOQlFVTXNUVUZCVFN4RFFVRkRMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF6dFJRVU55UXl4SlFVRkpMRU5CUVVNc1QwRkJUeXhIUVVGSExFbEJRVWtzUTBGQlF5eFBRVUZQTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8xRkJRM1pETEVsQlFVa3NRMEZCUXl4VFFVRlRMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1VVRkZNME1zU1VGQlNTeERRVUZETEVkQlFVY3NSMEZCUnl4SlFVRkpMR1ZCUVUwc1JVRkJSU3hEUVVGRE8xRkJRM2hDTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1IwRkJSeXhEUVVGRExHOURRVUZ2UXl4RFFVRkRMRU5CUVVNN1VVRkhia1FzU1VGQlNTeERRVUZETEZWQlFWVXNSVUZCUlN4RFFVRkRPMUZCUjJ4Q0xFbEJRVWtzVDBGQlR5eERRVUZETEVkQlFVY3NRMEZCUXl4VFFVRlRMRVZCUVVVN1dVRkRla0lzU1VGQlNTeERRVUZETEZGQlFWRXNSMEZCUnl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRExGTkJRVk1zUTBGQlF5eEpRVUZKTEVWQlFVVXNRMEZCUXp0VFFVTTVRenRoUVVGTk8xbEJRMHdzU1VGQlNTeERRVUZETEZGQlFWRXNSMEZCUnl4RlFVRkZMRU5CUVVNc1VVRkJVU3hGUVVGRkxFTkJRVU03V1VGRE9VSXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhKUVVGSkxFTkJRVU1zYzBKQlFYTkNMRWxCUVVrc1EwRkJReXhSUVVGUkxIZEVRVUYzUkN4RFFVRkRMRU5CUVVNN1UwRkROVWM3VVVGRFJDeEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRXRCUVVzc1EwRkJReXhWUVVGVkxFVkJRVVVzU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRPMUZCUnpGRExFbEJRVWtzVDBGQlR5eERRVUZETEVkQlFVY3NRMEZCUXl4WlFVRlpMRVZCUVVVN1dVRkROVUlzU1VGQlNUdG5Ra0ZEUml4SlFVRkpMRU5CUVVNc1YwRkJWeXhIUVVGSExGRkJRVkVzUTBGQlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRMRmxCUVZrc1JVRkJSU3hGUVVGRkxFTkJRVU1zUTBGQlF6dGhRVU16UkR0WlFVRkRMRTlCUVU4c1IwRkJSeXhGUVVGRk8yZENRVU5hTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1MwRkJTeXhEUVVGRExIVkNRVUYxUWl4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRE8yZENRVU0zUXl4UFFVRlBMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzJGQlEycENPMU5CUTBZN1lVRkJUVHRaUVVOTUxFbEJRVWtzUTBGQlF5eFhRVUZYTEVkQlFVY3NTVUZCU1N4RFFVRkRPMU5CUTNwQ08xRkJRMFFzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4TFFVRkxMRU5CUVVNc1lVRkJZU3hGUVVGRkxFbEJRVWtzUTBGQlF5eFhRVUZYTEVOQlFVTXNRMEZCUXp0UlFVZG9SQ3hKUVVGSkxFTkJRVU1zVjBGQlZ5eEhRVUZITEVOQlFVTXNUMEZCVHl4RFFVRkRMRWRCUVVjc1EwRkJReXhaUVVGWkxFbEJRVWtzUlVGQlJTeERRVUZETEVOQlFVTXNTVUZCU1N4RlFVRkZMRU5CUVVNN1VVRkRNMFFzU1VGQlNTeEpRVUZKTEVOQlFVTXNWMEZCVnl4RFFVRkRMRTFCUVUwc1NVRkJTU3hEUVVGRExFVkJRVVU3V1VGRGFFTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFTkJRVU1zZDBKQlFYZENMRU5CUVVNc1EwRkJRenRaUVVONlF5eFBRVUZQTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8xTkJRMnBDTzFGQlEwUXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFTkJRVU1zWVVGQllTeEZRVUZGTEVsQlFVa3NRMEZCUXl4WFFVRlhMRU5CUVVNc1EwRkJRenRSUVVkb1JDeEpRVUZKTEVOQlFVTXNWVUZCVlN4SFFVRkhMRTFCUVUwc1EwRkJReXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEVkQlFVY3NRMEZCUXl4WFFVRlhMRWxCUVVrc1JVRkJSU3hGUVVGRkxFdEJRVXNzUTBGQlF5eERRVUZETzFGQlEzQkZMRWxCUVVrc1NVRkJTU3hEUVVGRExGVkJRVlVzUTBGQlF5eE5RVUZOTEV0QlFVc3NSVUZCUlN4RlFVRkZPMWxCUTJwRExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNTMEZCU3l4RFFVRkRMRGhDUVVFNFFpeERRVUZETEVOQlFVTTdXVUZETDBNc1QwRkJUeXhEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0VFFVTnFRanRSUVVORUxFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNTMEZCU3l4RFFVRkRMRmxCUVZrc1JVRkJSU3hKUVVGSkxFTkJRVU1zVlVGQlZTeERRVUZETEVOQlFVTTdVVUZIT1VNc1NVRkJTU3hEUVVGRExHRkJRV0VzUjBGQlJ5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRMR1ZCUVdVc1NVRkJTU3h4UWtGQmNVSXNRMEZCUXp0UlFVTXhSU3hKUVVGSkxFTkJRVU1zUlVGQlJTeERRVUZETEZWQlFWVXNRMEZCUXl4SlFVRkpMRU5CUVVNc1lVRkJZU3hEUVVGRExFVkJRVVU3V1VGRGRFTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFTkJRVU1zTWtKQlFUSkNMRWxCUVVrc1EwRkJReXhoUVVGaExHdENRVUZyUWl4RFFVRkRMRU5CUVVNN1dVRkRhRVlzVDBGQlR5eERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRUUVVOcVFqdFJRVU5FTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1MwRkJTeXhEUVVGRExHVkJRV1VzUlVGQlJTeEpRVUZKTEVOQlFVTXNZVUZCWVN4RFFVRkRMRU5CUVVNN1VVRkhjRVFzVDBGQlR5eERRVUZETEVWQlFVVXNRMEZCUXl4UlFVRlJMRVZCUVVVc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETzFGQlEyaERMRTlCUVU4c1EwRkJReXhGUVVGRkxFTkJRVU1zVTBGQlV5eEZRVUZGTEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRSUVVkcVF5eEpRVUZKTEVOQlFVTXNUVUZCVFN4SFFVRkhMRWxCUVVrc1dVRkJUU3hGUVVGRkxFTkJRVU03VVVGRk0wSXNTVUZCU1N4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRkxFTkJRVU1zVDBGQlR5eEZRVUZGTEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRSUVVOMFF5eEpRVUZKTEVOQlFVTXNUVUZCVFN4RFFVRkRMRVZCUVVVc1EwRkJReXhOUVVGTkxFVkJRVVVzU1VGQlNTeERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRPMUZCUTNCRExFbEJRVWtzUTBGQlF5eE5RVUZOTEVOQlFVTXNSVUZCUlN4RFFVRkRMRTlCUVU4c1JVRkJSU3hKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTTdVVUZEZEVNc1NVRkJTU3hEUVVGRExFMUJRVTBzUTBGQlF5eEZRVUZGTEVOQlFVTXNVMEZCVXl4RlFVRkZMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF6dFJRVWN4UXl4SlFVRkpMRU5CUVVNc1QwRkJUeXhGUVVGRkxFTkJRVU03U1VGRGFrSXNRMEZCUXp0SlFVdFBMRTlCUVU4N1VVRkRZaXhKUVVGSkxFbEJRVWtzUTBGQlF5eG5Ra0ZCWjBJc1JVRkJSVHRaUVVONlFpeFpRVUZaTEVOQlFVTXNTVUZCU1N4RFFVRkRMR2RDUVVGblFpeERRVUZETEVOQlFVTTdXVUZEY0VNc1NVRkJTU3hEUVVGRExHZENRVUZuUWl4SFFVRkhMRWxCUVVrc1EwRkJRenRUUVVNNVFqdFJRVWRFTEVsQlFVa3NTVUZCU1N4RFFVRkRMRlZCUVZVc1JVRkJSVHRaUVVOdVFpeFBRVUZQTzFOQlExSTdVVUZGUkN4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFbEJRVWtzUTBGQlF5eHBRa0ZCYVVJc1NVRkJTU3hEUVVGRExGZEJRVmNzU1VGQlNTeEpRVUZKTEVOQlFVTXNWMEZCVnl4TlFVRk5MRU5CUVVNc1EwRkJRVHRSUVVVeFJTeEpRVUZKTEVOQlFVTXNUVUZCVFN4RFFVRkRMRTlCUVU4c1EwRkJRenRaUVVOc1FpeEpRVUZKTEVWQlFVVXNTVUZCU1N4RFFVRkRMRmRCUVZjN1dVRkRkRUlzU1VGQlNTeEZRVUZGTEVsQlFVa3NRMEZCUXl4WFFVRlhPMU5CUTNaQ0xFTkJRVU1zUTBGQlF6dEpRVU5NTEVOQlFVTTdTVUZMVHl4VFFVRlRPMUZCUTJZc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEpRVUZKTEVOQlFVTXNkMEpCUVhkQ0xFTkJRVU1zUTBGQlF6dFJRVU40UXl4SlFVRkpMRWxCUVVrc1EwRkJReXhuUWtGQlowSXNSVUZCUlR0WlFVTjZRaXhaUVVGWkxFTkJRVU1zU1VGQlNTeERRVUZETEdkQ1FVRm5RaXhEUVVGRExFTkJRVU03VTBGRGNrTTdVVUZEUkN4SlFVRkpMRU5CUVVNc1owSkJRV2RDTEVkQlFVY3NTVUZCU1N4RFFVRkRPMGxCUXk5Q0xFTkJRVU03U1VGTlR5eE5RVUZOTEVOQlFVVXNTVUZCV1R0UlFVTXhRaXhKUVVGSkxFTkJRVU1zVVVGQlVTeEpRVUZKTEVsQlFVa3NRMEZCUXl4UlFVRlJMRVZCUVVVc1EwRkJRenRSUVVkcVF5eEpRVUZKTEVkQlFVY3NSMEZCUnl4SlFVRkpMRU5CUVVNc1VVRkJVU3hEUVVGRExFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0UlFVTjBReXhQUVVGUExFZEJRVWNzUjBGQlJ5eERRVUZETEVWQlFVVTdXVUZEWkN4TlFVRk5MRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU1zVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRMRVZCUVVVc1IwRkJSeXhEUVVGRExFTkJRVU03V1VGRGVFTXNTVUZCU1N4RFFVRkRMRkZCUVZFc1IwRkJSeXhKUVVGSkxFTkJRVU1zVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRExFTkJRVU03V1VGRE4wTXNTVUZCU1N4RFFVRkRMR2RDUVVGblFpeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMWxCUXpOQ0xFZEJRVWNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVVUZCVVN4RFFVRkRMRTlCUVU4c1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF6dFRRVU51UXp0SlFVTklMRU5CUVVNN1NVRk5ZU3huUWtGQlowSXNRMEZCUlN4SFFVRlhPenRaUVVWNlF5eEpRVUZKTEVsQlFXZENMRU5CUVVNN1dVRkRja0lzU1VGQlNUdG5Ra0ZEUml4TlFVRk5MRTlCUVU4c1IwRkJSeXhKUVVGQkxHZENRVUZQTEVWQlFVTXNSMEZCUnl4RlFVRkZMRWxCUVVrc1EwRkJReXhWUVVGVkxFTkJRVU1zUTBGQlF6dG5Ra0ZET1VNc1NVRkJTU3hIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1lVRkROVUk3V1VGQlF5eFBRVUZQTEVkQlFWRXNSVUZCUlR0blFrRkRha0lzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRU5CUVVNc01rSkJRVEpDTEVkQlFVY3NRMEZCUXl4UlFVRlJMRVZCUVVVc1JVRkJSU3hEUVVGRExFTkJRVU03WjBKQlJUTkVMRWxCUVVrc1EwRkJReXhOUVVGTkxFTkJRVU1zUjBGQlJ5eEZRVUZGTEVOQlFVTTdaMEpCUTJ4Q0xFOUJRVTg3WVVGRFVqdFpRVVZFTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1MwRkJTeXhEUVVGRExIVkNRVUYxUWl4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE8xbEJSVGxETEZGQlFWRXNTVUZCU1N4RFFVRkRMRWRCUVVjc1JVRkJSVHRuUWtGRGFFSXNTMEZCU3l4WlFVRlpPMjlDUVVWbUxFbEJRVWtzU1VGQlNTeERRVUZETEdWQlFXVXNTMEZCU3l4blEwRkJkVUlzUlVGQlJUdDNRa0ZEY0VRc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEpRVUZKTEVOQlFVTXNiMEpCUVc5Q0xFbEJRVWtzUTBGQlF5eGxRVUZsTEhWRlFVRjFSU3huUTBGQmRVSXNkVU5CUVhWRExFTkJRVU1zUTBGQlF6dHhRa0ZET1V3N2IwSkJSVVFzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRU5CUVVNc2IwTkJRVzlETEVOQlFVTXNRMEZCUXp0dlFrRkRjRVFzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXp0M1FrRkRVaXhIUVVGSExFVkJRVVVzV1VGQldUdDNRa0ZEYWtJc1pVRkJaU3hGUVVGRkxHZERRVUYxUWp0M1FrRkRlRU1zVVVGQlVTeEZRVUZGTEVsQlFVa3NRMEZCUXl4UlFVRlJPM0ZDUVVONFFpeERRVUZETEVOQlFVTTdiMEpCUTBnc1RVRkJUVHRuUWtGRlVpeExRVUZMTEUxQlFVMDdiMEpCUlZRc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eFBRVUZQTEVWQlFVVTdkMEpCUTJwQ0xFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNTVUZCU1N4RFFVRkRMR2RFUVVGblJDeERRVUZETEVOQlFVTTdkMEpCUTJoRkxFOUJRVTg3Y1VKQlExSTdiMEpCUlVRc1NVRkJTU3hIUVVGWExFTkJRVU03YjBKQlEyaENMRWxCUVVrN2QwSkJRMFlzUjBGQlJ5eEhRVUZITEUxQlFVMHNVVUZCVVN4RFFVRkRMRWRCUVVjc1NVRkJTU3hEUVVGRExHRkJRV0VzU1VGQlNTeEpRVUZKTEVOQlFVTXNUMEZCVHl4WFFVRlhMRVZCUVVVc1RVRkJUU3hEUVVGRExFTkJRVU03ZDBKQlF5OUZMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUzBGQlN5eERRVUZETEd0Q1FVRnJRaXhKUVVGSkxFTkJRVU1zWVVGQllTeEpRVUZKTEVsQlFVa3NRMEZCUXl4UFFVRlBMRmxCUVZrc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF6dHhRa0ZEZGtZN2IwSkJRVU1zVDBGQlR5eEhRVUZSTEVWQlFVVTdkMEpCUTJwQ0xFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNTVUZCU1N4RFFVRkRMR3RDUVVGclFpeEpRVUZKTEVOQlFVTXNZVUZCWVN4SlFVRkpMRWxCUVVrc1EwRkJReXhQUVVGUExIRkNRVUZ4UWl4SFFVRkhMRU5CUVVNc1VVRkJVU3hGUVVGRkxFVkJRVVVzUTBGQlF5eERRVUZETzNkQ1FVTjZSeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenQzUWtGRGNFSXNSMEZCUnl4SFFVRkhMRVZCUVVVc1EwRkJRenR4UWtGRFZqdHZRa0ZGUkN4TlFVRk5MRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU03ZDBKQlEyUXNSMEZCUnl4RlFVRkZMRTFCUVUwN2QwSkJRMWdzVDBGQlR5eEZRVUZGTEVsQlFVa3NRMEZCUXl4UFFVRlBPM2RDUVVOeVFpeEZRVUZGTEVWQlFVVXNTVUZCU1N4RFFVRkRMRVZCUVVVN2QwSkJRMWdzUjBGQlJ6dHhRa0ZEU2l4RFFVRkRMRU5CUVVNN2IwSkJRMGdzVFVGQlRUdG5Ra0ZGVWl4TFFVRkxMRkZCUVZFN2IwSkJSVmdzU1VGQlNUdDNRa0ZEUml4TlFVRk5MRXRCUVVzc1IwRkJSeXhOUVVGTkxFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNZVUZCWVN4RFFVRkRMRU5CUVVNN2QwSkJSV2hFTEUxQlFVMHNTMEZCU3l4SFFVRnpRaXhGUVVGRkxFTkJRVU03ZDBKQlEzQkRMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4TFFVRkxMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGT3pSQ1FVTnlReXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZGTEVOQlFVTXNRMEZCUlN4RFFVRkRMRXRCUVVzc1EwRkJReXh2UWtGQmIwSXNRMEZCUXl4RlFVRkZPMmREUVVNelF5eFRRVUZUT3paQ1FVTldPelJDUVVORUxFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNTMEZCU3l4RFFVRkRMRmRCUVZjc1NVRkJTU3hEUVVGRExHRkJRV0VzU1VGQlNTeExRVUZMTEVOQlFVVXNRMEZCUXl4RFFVRkZMRzFDUVVGdFFpeERRVUZETEVOQlFVTTdORUpCUXk5RkxFdEJRVXNzUTBGQlF5eEpRVUZKTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1NVRkJTU3hEUVVGRExHRkJRV0VzU1VGQlNTeExRVUZMTEVOQlFVVXNRMEZCUXl4RFFVRkZMRzFDUVVGdFFpeEZRVUZGTEUxQlFVMHNRMEZCUXl4RFFVRkRMRU5CUVVNN2VVSkJRM1JHTzNkQ1FVVkVMRTFCUVUwc1UwRkJVeXhIUVVGaExFTkJRVU1zVFVGQlRTeFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZYTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWRCUVVjc1JVRkJSU3hGUVVGRk96UkNRVU51Uml4SFFVRkhMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUjBGQlJ5eERRVUZETEVsQlFVa3NSVUZCUlN4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF5eERRVUZET3pSQ1FVTndReXhQUVVGUExFZEJRVWNzUTBGQlF6dDNRa0ZEWWl4RFFVRkRMRVZCUVVVc1JVRkJSU3hEUVVGRExFTkJRVU03ZDBKQlJWQXNUVUZCVFN4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRE96UkNRVU5rTEVkQlFVY3NSVUZCUlN4UlFVRlJPelJDUVVOaUxFVkJRVVVzUlVGQlJTeEpRVUZKTEVOQlFVTXNSVUZCUlRzMFFrRkRXQ3hSUVVGUkxFVkJRVVVzU1VGQlNTeERRVUZETEZGQlFWRTdORUpCUTNaQ0xGTkJRVk03ZVVKQlExWXNRMEZCUXl4RFFVRkRPM0ZDUVVWS08yOUNRVUZETEU5QlFVOHNSMEZCVVN4RlFVRkZPM2RDUVVOcVFpeEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJReXhwUTBGQmFVTXNSMEZCUnl4RFFVRkRMRkZCUVZFc1JVRkJSU3hGUVVGRkxFTkJRVU1zUTBGQlF6dDNRa0ZEYWtVc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN2NVSkJRM0pDTzI5Q1FVVkVMRTFCUVUwN1owSkJSVkk3YjBKQlEwVXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhKUVVGSkxFTkJRVU1zT0VKQlFUaENMRU5CUVVNc1EwRkJRenRoUVVOcVJEdFJRVU5JTEVOQlFVTTdTMEZCUVR0SlFVOVBMRTlCUVU4c1EwRkJSU3hIUVVGVk8xRkJRM3BDTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1NVRkJTU3hEUVVGRExHVkJRV1VzUlVGQlJTeEhRVUZITEVOQlFVTXNVVUZCVVN4RlFVRkZMRU5CUVVNc1EwRkJRenRSUVVNdlF5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dFJRVWR3UWl4SlFVRkpMRU5CUVVNc1RVRkJUU3hEUVVGRExFZEJRVWNzUlVGQlJTeERRVUZETzFGQlJXeENMRWxCUVVrc1EwRkJReXhUUVVGVExFVkJRVVVzUTBGQlF6dEpRVU51UWl4RFFVRkRPMGxCUzA4c1QwRkJUenRSUVVOaUxFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNTVUZCU1N4RFFVRkRMR1ZCUVdVc1EwRkJReXhEUVVGRE8xRkJReTlDTEVsQlFVa3NRMEZCUXl4VFFVRlRMRVZCUVVVc1EwRkJRenRKUVVOdVFpeERRVUZETzBsQlMwOHNVMEZCVXp0UlFVTm1MRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zWjBKQlFXZENMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVlVGQlZTeEZRVUZGTzFsQlJUbERMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zU1VGQlNTeERRVUZETEhsQ1FVRjVRaXhEUVVGRExFTkJRVU03V1VGRGVrTXNTVUZCU1N4RFFVRkRMR2RDUVVGblFpeEhRVUZITEZWQlFWVXNRMEZCUXl4SlFVRkpMRU5CUVVNc1QwRkJUeXhGUVVGRkxFdEJRVXNzUTBGQlF5eERRVUZETzFOQlEzcEVPMGxCUTBnc1EwRkJRenRKUVU5aExFbEJRVWtzUTBGQlJTeEpRVUZuUWpzN1dVRkRiRU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4TFFVRkxMRU5CUVVNc2EwSkJRV3RDTEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN1dVRkRla01zVDBGQlR5eEpRVUZKTEU5QlFVOHNRMEZCVHl4RFFVRkRMRTlCUVU4c1JVRkJSU3hOUVVGTkxFVkJRVVVzUlVGQlJUdG5Ra0ZETTBNc1NVRkJTU3hEUVVGRExFMUJRVTBzUTBGQlF5eExRVUZMTEVOQlFVTXNTVUZCUVN4blFrRkJUeXhGUVVGRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNTVUZCU1N4RFFVRkRMRVZCUVVVc1NVRkJTU3hEUVVGRExGVkJRVlVzUTBGQlF5eEhRVUZITEVsQlFVa3NSVUZCUlN4RFFVRkRMRWRCUVVjc1JVRkJSU3hGUVVGRk8yOUNRVU12UlN4SlFVRkpMRWRCUVVjc1JVRkJSVHQzUWtGRFVDeE5RVUZOTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN2NVSkJRMkk3ZVVKQlFVMDdkMEpCUTB3c1QwRkJUeXhGUVVGRkxFTkJRVU03Y1VKQlExZzdaMEpCUTBnc1EwRkJReXhEUVVGRExFTkJRVU03V1VGRFRDeERRVUZETEVOQlFVTXNRMEZCUVR0UlFVTktMRU5CUVVNN1MwRkJRVHRKUVV0UExGVkJRVlU3VVVGRGFFSXNTVUZCU1N4RFFVRkRMRVZCUVVVc1EwRkJReXhWUVVGVkxFTkJRVU1zVFVGQlRTeERRVUZETzFsQlFVVXNUMEZCVHp0UlFVVnVReXhKUVVGSkxFbEJRV01zUTBGQlF6dFJRVU51UWl4SlFVRkpPMWxCUTBZc1NVRkJTU3hIUVVGSExFVkJRVVVzUTBGQlF5eFpRVUZaTEVOQlFVTXNUVUZCVFN4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhEUVVGRExFVkJRVVVzUlVGQlJTeERRVUZETEVOQlFVTXNRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJReXhEUVVGRE8xTkJRekZGTzFGQlFVTXNUMEZCVHl4SFFVRkhMRVZCUVVVN1dVRkRXaXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEV0QlFVc3NRMEZCUXl4MVFrRkJkVUlzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXp0WlFVTTNReXhQUVVGUE8xTkJRMUk3VVVGRlJDeExRVUZMTEUxQlFVMHNTVUZCU1N4SlFVRkpMRWxCUVVrc1JVRkJSVHRaUVVOMlFpeEpRVUZKTEVOQlFVTXNTVUZCU1N4SlFVRkpMRWxCUVVrc1EwRkJReXhWUVVGVkxFTkJRVU1zUjBGQlJ5eERRVUZETzJkQ1FVRkZMRk5CUVZNN1dVRkZOVU1zVFVGQlRTeEhRVUZITEVkQlFVY3NTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dFpRVU01UWl4SlFVRkpMRWRCUVVjc1NVRkJTU3hEUVVGRE8yZENRVUZGTEZOQlFWTTdXVUZGZGtJc1RVRkJUU3hIUVVGSExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRMRVZCUVVVc1IwRkJSeXhEUVVGRExFTkJRVU1zU1VGQlNTeEZRVUZGTEVOQlFVTTdXVUZEZEVNc1RVRkJUU3hIUVVGSExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRExFTkJRVU1zU1VGQlNTeEZRVUZGTEVOQlFVTXNUMEZCVHl4RFFVRkRMRlZCUVZVc1JVRkJSU3hGUVVGRkxFTkJRVU1zUTBGQlF6dFpRVVV2UkN4SlFVRkpMRkZCUVZFc1EwRkJReXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXl4RlFVRkZPMmRDUVVVNVFpeEpRVUZKTEU5QlFVOHNRMEZCUXl4SFFVRkhMRU5CUVVNc1IwRkJSeXhEUVVGRE8yOUNRVUZGTEZOQlFWTTdaMEpCUnk5Q0xFOUJRVThzUTBGQlF5eEhRVUZITEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1IwRkJSeXhEUVVGRE8yZENRVU4yUWl4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFdEJRVXNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMR2xDUVVGcFFpeERRVUZETEVOQlFVTTdZVUZEY2tRN1UwRkRSanRKUVVOSUxFTkJRVU03U1VGTlR5eEpRVUZKTzFGQlExWXNTVUZCU1N4RFFVRkRMRlZCUVZVc1IwRkJSeXhKUVVGSkxFTkJRVU03VVVGRmRrSXNTVUZCU1N4SlFVRkpMRU5CUVVNc1owSkJRV2RDTEVWQlFVVTdXVUZEZWtJc1dVRkJXU3hEUVVGRExFbEJRVWtzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhEUVVGRE8xTkJRM0pETzFGQlJVUXNTVUZCU1N4RFFVRkRMRTFCUVUwc1EwRkJReXhIUVVGSExFVkJRVVVzUTBGQlF6dEpRVU53UWl4RFFVRkRPME5CUTBZN1FVRkhSQ3hKUVVGSkxHRkJRV0VzUlVGQlJTeERRVUZESW4wPQ==',
'logger.js': 'InVzZSBzdHJpY3QiOwpPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgIl9fZXNNb2R1bGUiLCB7IHZhbHVlOiB0cnVlIH0pOwpleHBvcnRzLkxvZ2dlciA9IHZvaWQgMDsKY2xhc3MgTG9nZ2VyIHsKICAgIGxvZyguLi5hcmdzKSB7CiAgICAgICAgY29uc29sZS5sb2coLi4uYXJncyk7CiAgICB9CiAgICBkZWJ1ZyguLi5hcmdzKSB7CiAgICAgICAgaWYgKCFwcm9jZXNzLmVudi5ERUJVRykgewogICAgICAgICAgICByZXR1cm47CiAgICAgICAgfQogICAgICAgIGNvbnNvbGUubG9nKCdbRGVidWddJywgLi4uYXJncyk7CiAgICB9CiAgICBpbmZvKC4uLmFyZ3MpIHsKICAgICAgICBjb25zb2xlLmxvZygnW0luZm9dJywgLi4uYXJncyk7CiAgICB9CiAgICB3YXJuKC4uLmFyZ3MpIHsKICAgICAgICBjb25zb2xlLndhcm4oJ1tXYXJuXScsIC4uLmFyZ3MpOwogICAgfQogICAgZXJyb3IoLi4uYXJncykgewogICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tFcnJvcl0nLCAuLi5hcmdzKTsKICAgIH0KfQpleHBvcnRzLkxvZ2dlciA9IExvZ2dlcjsKLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pYkc5bloyVnlMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE1pT2xzaUxpNHZMaTR2YzNKakwzSmxiVzkwWlM5c2IyZG5aWEl1ZEhNaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWpzN08wRkJSMEVzVFVGQllTeE5RVUZOTzBsQlRWWXNSMEZCUnl4RFFVRkZMRWRCUVVjc1NVRkJWenRSUVVONFFpeFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1NVRkJTU3hEUVVGRExFTkJRVU03U1VGRGRrSXNRMEZCUXp0SlFVOU5MRXRCUVVzc1EwRkJSU3hIUVVGSExFbEJRVmM3VVVGRE1VSXNTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhIUVVGSExFTkJRVU1zUzBGQlN5eEZRVUZGTzFsQlEzUkNMRTlCUVU4N1UwRkRVanRSUVVORUxFOUJRVThzUTBGQlF5eEhRVUZITEVOQlFVTXNVMEZCVXl4RlFVRkZMRWRCUVVjc1NVRkJTU3hEUVVGRExFTkJRVU03U1VGRGJFTXNRMEZCUXp0SlFVMU5MRWxCUVVrc1EwRkJSU3hIUVVGSExFbEJRVmM3VVVGRGVrSXNUMEZCVHl4RFFVRkRMRWRCUVVjc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNRMEZCUXp0SlFVTnFReXhEUVVGRE8wbEJUVTBzU1VGQlNTeERRVUZGTEVkQlFVY3NTVUZCVnp0UlFVTjZRaXhQUVVGUExFTkJRVU1zU1VGQlNTeERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRWxCUVVrc1EwRkJReXhEUVVGRE8wbEJRMnhETEVOQlFVTTdTVUZQVFN4TFFVRkxMRU5CUVVVc1IwRkJSeXhKUVVGWE8xRkJRekZDTEU5QlFVOHNRMEZCUXl4TFFVRkxMRU5CUVVNc1UwRkJVeXhGUVVGRkxFZEJRVWNzU1VGQlNTeERRVUZETEVOQlFVTTdTVUZEY0VNc1EwRkJRenREUVVOR08wRkJPVU5FTEhkQ1FUaERReUo5'
};
for (const f in files) {
    const content = Buffer.from(files[f], 'base64').toString('utf-8');
    fs.writeFileSync(f, content, { encoding: 'utf-8' });
}
const systemDContent = `[Unit]
Description=ioBroker.ds18b20 remote client
Documentation=https://github.com/crycode-de/ioBroker.ds18b20
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${__dirname}
ExecStart=${process.execPath} ${path.join(__dirname, 'ds18b20-remote-client.js')}
Restart=on-failure

[Install]
WantedBy=multi-user.target
`;
const systemDFile = path.join(__dirname, SYSTEMD_SERVICE_NAME);
fs.writeFileSync(systemDFile, systemDContent, { encoding: 'utf-8' });
const dotEnvContent = `# Settings for the ioBroker.ds18b20 remote client

# Unique ID for this remote system
SYSTEM_ID=my-remote

# IP or hostname of the ioBroker host running the adapter
ADAPTER_HOST=

# Port from the adapter config
ADAPTER_PORT=1820

# Encryption key from the adapter config
ADAPTER_KEY=

# Enable debug log output
#DEBUG=1

# System path of the 1-wire devices
#W1_DEVICES_PATH=/sys/bus/w1/devices
`;
const dotEnvFile = path.join(__dirname, '.env');
if (!fs.existsSync(dotEnvFile)) {
    fs.writeFileSync(dotEnvFile, dotEnvContent, { encoding: 'utf-8' });
}
console.log(`- ioBroker.ds18b20 remote client -

Basic setup done.

Please adjust the settings in the .env file.

To manually start the client just run:
  node ds18b20-remote-client.js

To setup the SystemD service, please run:
  sudo cp ${SYSTEMD_SERVICE_NAME} /etc/systemd/system/${SYSTEMD_SERVICE_NAME}
  sudo systemctl daemon-reload
  sudo systemctl enable ${SYSTEMD_SERVICE_NAME}
  sudo systemctl start ${SYSTEMD_SERVICE_NAME}
`);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcmVtb3RlL3NldHVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBTUEseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFFN0IsTUFBTSxvQkFBb0IsR0FBRyxpQ0FBaUMsQ0FBQztBQUUvRCxNQUFNLEtBQUssR0FBMkI7SUFDcEMsSUFBSSxFQUFFLE9BQU87Q0FDZCxDQUFDO0FBRUYsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUU7SUFDckIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xFLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0NBQ3JEO0FBRUQsTUFBTSxjQUFjLEdBQUc7Ozs7Ozs7T0FPaEIsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVE7bUJBQ1YsU0FBUztZQUNoQixPQUFPLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDBCQUEwQixDQUFDOzs7OztDQUsvRSxDQUFDO0FBRUYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztBQUMvRCxFQUFFLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUVyRSxNQUFNLGFBQWEsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQW1CckIsQ0FBQztBQUVGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ2hELElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO0lBQzlCLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0NBQ3BFO0FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQzs7Ozs7Ozs7OztZQVVBLG9CQUFvQix3QkFBd0Isb0JBQW9COzswQkFFbEQsb0JBQW9CO3lCQUNyQixvQkFBb0I7Q0FDNUMsQ0FBQyxDQUFDIn0=