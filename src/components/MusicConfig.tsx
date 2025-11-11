"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useMusic } from '@/contexts/MusicContext';
import {
  fetchMusicData,
  getHotPlaylists,
  searchMusic,
  getMusicServerInfo,
  getMusicTypeInfo
} from '@/services/musicService';
import { MusicServer, MusicType, Playlist } from '@/types/music';

interface MusicConfigProps {
  onPlaylistLoaded: (playlist: Playlist) => void;
}

export default function MusicConfig({ onPlaylistLoaded }: MusicConfigProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  // 状态
  const [server, setServer] = useState<MusicServer>(MusicServer.NETEASE);
  const [type, setType] = useState<MusicType>(MusicType.PLAYLIST);
  const [id, setId] = useState('167985096');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hotPlaylists, setHotPlaylists] = useState<Playlist[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Playlist[]>([]);
  const [activeTab, setActiveTab] = useState<'hot' | 'search' | 'custom' | 'input'>('hot');
  const [playlistUrl, setPlaylistUrl] = useState('');
  
  // 加载热门歌单
  useEffect(() => {
    const loadHotPlaylists = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const playlists = await getHotPlaylists(server, 5);
        setHotPlaylists(playlists);
      } catch (err) {
        setError('加载热门歌单失败');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHotPlaylists();
  }, [server]);
  
  // 搜索音乐
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const songs = await searchMusic(searchKeyword, server, 10);
      
      if (songs.length > 0) {
        // 将搜索结果转换为歌单格式
        const searchPlaylist: Playlist = {
          id: `search-${Date.now()}`,
          name: `搜索: ${searchKeyword}`,
          songs
        };
        
        setSearchResults([searchPlaylist]);
      } else {
        setSearchResults([]);
        setError('未找到相关音乐');
      }
    } catch (err) {
      setError('搜索失败');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 加载自定义歌单
  const handleLoadCustomPlaylist = async () => {
    if (!id.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const playlist = await fetchMusicData(server, type, id);
      
      if (playlist) {
        onPlaylistLoaded(playlist);
      } else {
        setError('加载歌单失败，请检查ID是否正确');
      }
    } catch (err) {
      setError('加载歌单失败');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 选择热门歌单
  const handleSelectHotPlaylist = (playlist: Playlist) => {
    onPlaylistLoaded(playlist);
  };
  
  // 选择搜索结果
  const handleSelectSearchResult = (playlist: Playlist) => {
    onPlaylistLoaded(playlist);
  };
  
  // 解析歌单URL并提取ID
  const parsePlaylistUrl = (url: string): { server: MusicServer; type: MusicType; id: string } | null => {
    // 网易云音乐歌单URL格式: https://music.163.com/playlist?id=123456789
    if (url.includes('music.163.com') && url.includes('playlist')) {
      const match = url.match(/playlist\?id=(\d+)/);
      if (match && match[1]) {
        return { server: MusicServer.NETEASE, type: MusicType.PLAYLIST, id: match[1] };
      }
    }
    
    // 网易云音乐专辑URL格式: https://music.163.com/album?id=123456789
    if (url.includes('music.163.com') && url.includes('album')) {
      const match = url.match(/album\?id=(\d+)/);
      if (match && match[1]) {
        return { server: MusicServer.NETEASE, type: MusicType.ALBUM, id: match[1] };
      }
    }
    
    // 网易云音乐歌手URL格式: https://music.163.com/artist?id=123456789
    if (url.includes('music.163.com') && url.includes('artist')) {
      const match = url.match(/artist\?id=(\d+)/);
      if (match && match[1]) {
        return { server: MusicServer.NETEASE, type: MusicType.ARTIST, id: match[1] };
      }
    }
    
    // QQ音乐歌单URL格式: https://y.qq.com/n/ryqq/playlist/123456789.html
    if (url.includes('y.qq.com') && url.includes('playlist')) {
      const match = url.match(/playlist\/(\d+)\.html/);
      if (match && match[1]) {
        return { server: MusicServer.TENCENT, type: MusicType.PLAYLIST, id: match[1] };
      }
    }
    
    // QQ音乐专辑URL格式: https://y.qq.com/n/ryqq/albumDetail/123456789.html
    if (url.includes('y.qq.com') && url.includes('albumDetail')) {
      const match = url.match(/albumDetail\/(\d+)\.html/);
      if (match && match[1]) {
        return { server: MusicServer.TENCENT, type: MusicType.ALBUM, id: match[1] };
      }
    }
    
    // QQ音乐歌手URL格式: https://y.qq.com/n/ryqq/singerDetail/123456789.html
    if (url.includes('y.qq.com') && url.includes('singerDetail')) {
      const match = url.match(/singerDetail\/(\d+)\.html/);
      if (match && match[1]) {
        return { server: MusicServer.TENCENT, type: MusicType.ARTIST, id: match[1] };
      }
    }
    
    // 如果直接输入的是数字ID，使用当前选择的服务器和类型
    if (/^\d+$/.test(url.trim())) {
      return { server, type, id: url.trim() };
    }
    
    return null;
  };
  
  // 处理输入歌单URL
  const handleInputPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const parsed = parsePlaylistUrl(playlistUrl);
      
      if (!parsed) {
        setError('无法解析歌单URL，请检查URL是否正确');
        setIsLoading(false);
        return;
      }
      
      const playlist = await fetchMusicData(parsed.server, parsed.type, parsed.id);
      
      if (playlist) {
        onPlaylistLoaded(playlist);
      } else {
        setError('加载歌单失败，请检查URL是否正确');
      }
    } catch (err) {
      setError('加载歌单失败');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800/90 text-white' : 'bg-white/90 text-gray-800'} backdrop-blur-sm shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">音乐源配置</h3>
        
        {/* 平台选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">音乐平台</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.values(MusicServer).map((s) => {
              const serverInfo = getMusicServerInfo(s);
              return (
                <button
                  key={s}
                  onClick={() => setServer(s)}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    server === s
                      ? 'text-white'
                      : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={server === s ? { backgroundColor: serverInfo.color } : {}}
                >
                  {serverInfo.displayName}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* 标签页 */}
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setActiveTab('hot')}
            className={`flex-1 py-2 px-4 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === 'hot'
                ? isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            热门歌单
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 px-4 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            搜索音乐
          </button>
          <button
            onClick={() => setActiveTab('input')}
            className={`flex-1 py-2 px-4 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === 'input'
                ? isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            输入歌单
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 px-4 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === 'custom'
                ? isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            自定义ID
          </button>
        </div>
        
        {/* 热门歌单 */}
        {activeTab === 'hot' && (
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {hotPlaylists.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => handleSelectHotPlaylist(playlist)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="truncate flex-1">
                        <p className="text-sm font-medium truncate">{playlist.name}</p>
                        <p className="text-xs opacity-70">{playlist.songs.length} 首歌曲</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* 搜索音乐 */}
        {activeTab === 'search' && (
          <div>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入歌曲名或歌手名"
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <button
                onClick={handleSearch}
                disabled={isLoading || !searchKeyword.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                搜索
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => handleSelectSearchResult(playlist)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="truncate flex-1">
                        <p className="text-sm font-medium truncate">{playlist.name}</p>
                        <p className="text-xs opacity-70">{playlist.songs.length} 首歌曲</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* 输入歌单 */}
        {activeTab === 'input' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">歌单URL或ID</label>
              <textarea
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="输入歌单URL或ID，支持网易云音乐、QQ音乐等平台"
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <p className="text-xs opacity-70 mt-1">
                支持格式：网易云音乐歌单/专辑/歌手链接、QQ音乐歌单/专辑/歌手链接，或直接输入数字ID
              </p>
            </div>
            
            <button
              onClick={handleInputPlaylist}
              disabled={isLoading || !playlistUrl.trim()}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '加载中...' : '加载歌单'}
            </button>
            
            <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-sm font-medium mb-2">支持的URL示例：</p>
              <div className="text-xs space-y-1 opacity-70">
                <p>• 网易云音乐歌单: https://music.163.com/playlist?id=123456789</p>
                <p>• 网易云音乐专辑: https://music.163.com/album?id=123456789</p>
                <p>• 网易云音乐歌手: https://music.163.com/artist?id=123456789</p>
                <p>• QQ音乐歌单: https://y.qq.com/n/ryqq/playlist/123456789.html</p>
                <p>• QQ音乐专辑: https://y.qq.com/n/ryqq/albumDetail/123456789.html</p>
                <p>• QQ音乐歌手: https://y.qq.com/n/ryqq/singerDetail/123456789.html</p>
              </div>
            </div>
          </div>
        )}
        
        {/* 自定义ID */}
        {activeTab === 'custom' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">内容类型</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.values(MusicType).map((t) => {
                  const typeInfo = getMusicTypeInfo(t);
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                        type === t
                          ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                          : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {typeInfo.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {getMusicTypeInfo(type).displayName} ID
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder={`输入${getMusicTypeInfo(type).displayName}ID`}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            
            <button
              onClick={handleLoadCustomPlaylist}
              disabled={isLoading || !id.trim()}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '加载中...' : '加载'}
            </button>
          </div>
        )}
        
        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-700 border border-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}