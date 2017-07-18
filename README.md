# postgre
PostgreSQL implementation of spreading

spreadFromSpreadByPath(spread, path)
  // распределяет только от spread.target по пути path
  после завершения, на path.target применяет spreadFromSpread(justCreatedSpread)
  
spreadFromSpread(spread)
  // спредит вниз по ВСЕМ путям доступным от spread.target
  spreadFromSpreadByPath(spread, path /* в стандарте source,id,target*/)
  
spreadTo(targetRef, spreadsStorageRef)
  ~распределяет всё что может к targetRef? нет ведь spreads таблиц может быть немерено и мы не знаем какие они, не перебирать же все ВСЕЕЕ спредеблы...~
  распределяет к [targetRef] конкретный спредс сторедж
    находит все спредеблы этого спредса и находит все допустимые пути для этого спредса
      для каждого стореджа путей находит все пути в нем ведущик К ( target)  [targetRef] ((foundedPath))
        находит все спреды в spreadsStorageRef ведущие к (ОТ (source) стороне пути найденного выше пути (foundedPath))
          проверяет нет ли у [targetRef] уже существующего спреда с root == foundedSpread.root || root == foundedSpread.id
            если нет, вызвать spreadFromSpreadByPath(foundedSpread, foundedPath)
	    
unspreadFromPath(pathRef)
  // удаляет проходящие по пути спреды
  найти спреды с path == pathRef и удалить их, вызвав полный цикл удаления дальше зависимых спредов по prev полю
    ПО ПУТИ ЗАПОМНИТЬ ОБЯЗАТЕЛЬНО ОДИН СПРЕД ВЕДУЩИЙ К [[pathRef]].target
      после завершения удаления выполнить spreadTo([[pathRef]].target)
