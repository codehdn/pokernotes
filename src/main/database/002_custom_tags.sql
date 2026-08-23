ALTER TABLE exploit_tags ADD COLUMN color TEXT NOT NULL DEFAULT '#3a6c90';
CREATE TABLE primary_tags (key TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, description TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#3a6c90', is_builtin INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0);
INSERT INTO primary_tags(key,name,description,color,is_builtin,sort_order) VALUES
('REC','REC','Recreational player, but not enough information yet to classify further.','#64748b',1,0),
('FISH','FISH','Clearly weak player with significant exploitable mistakes.','#2563eb',1,1),
('WHALE','WHALE','Extremely weak, high-action player willing to put lots of money in badly.','#7c3aed',1,2),
('STATION','STATION','Calls too wide and too often, especially postflop.','#0891b2',1,3),
('MANIAC','MANIAC','Extremely aggressive player betting and raising far too wide.','#dc2626',1,4),
('NIT','NIT','Plays very tight and generally gives action with strong ranges.','#475569',1,5),
('REG','REG','Competent regular who generally understands solid poker strategy.','#16a34a',1,6),
('GOOD_REG','GOOD REG','Strong regular who is likely thinking strategically and adjusting to opponents.','#ca8a04',1,7);
