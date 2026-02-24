const handleTagClick = (tag: string, e: React.MouseEvent) => {
  // 筛选同标签文章并按日期倒序排序
  const filteredPosts = allPosts
    .filter(post => post.tags.includes(tag))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  setSelectedTag(tag);
  setTagPosts(filteredPosts);
  setShowTagModal(true);
};