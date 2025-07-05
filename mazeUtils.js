// mazeUtils.js

function generateMaze(rows, cols) {
    const maze = Array(rows)
      .fill()
      .map(() => Array(cols).fill(1));
  
    const stack = [];
    const directions = [
      [0, -2],
      [0, 2],
      [-2, 0],
      [2, 0]
    ];
  
    const centerRow = Math.floor(rows / 2);
    const centerCol = Math.floor(cols / 2);
  
    const isValid = (x, y) => {
      const inBounds = x > 0 && x < rows - 1 && y > 0 && y < cols - 1;
      const inCenter =
        x >= centerRow - 1 &&
        x <= centerRow + 1 &&
        y >= centerCol - 1 &&
        y <= centerCol + 1;
      return inBounds && !inCenter;
    };
  
    const carvePath = (x, y) => {
      maze[x][y] = 0;
      stack.push([x, y]);
  
      while (stack.length > 0) {
        const [cx, cy] = stack[stack.length - 1];
        const shuffledDirs = directions.sort(() => Math.random() - 0.5);
        let moved = false;
  
        for (let [dx, dy] of shuffledDirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (isValid(nx, ny) && maze[nx][ny] === 1) {
            maze[cx + dx / 2][cy + dy / 2] = 0;
            maze[nx][ny] = 0;
            stack.push([nx, ny]);
            moved = true;
            break;
          }
        }
        if (!moved) stack.pop();
      }
    };
  
    carvePath(1, 1);
  
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        maze[centerRow + i][centerCol + j] = 0;
      }
    }
  
    maze[centerRow - 2][centerCol] = 0;
    maze[centerRow - 3][centerCol] = 0;
    maze[centerRow + 2][centerCol] = 0;
    maze[centerRow + 3][centerCol] = 0;
    maze[centerRow][centerCol - 2] = 0;
    maze[centerRow][centerCol - 3] = 0;
    maze[centerRow][centerCol + 2] = 0;
    maze[centerRow][centerCol + 3] = 0;
  
    const exits = [];
    const potentialExitSides = ["top", "bottom", "left", "right"];
    const usedSides = new Set();
    let finishX = 0,
      finishY = 0;
  
    while (exits.length < 1 && usedSides.size < 4) {
      const side =
        potentialExitSides[Math.floor(Math.random() * potentialExitSides.length)];
      if (usedSides.has(side)) continue;
  
      let exitX = 0,
        exitY = 0;
  
      if (side === "right") {
        for (let i = rows - 2; i >= 1; i--) {
          if (maze[i][cols - 2] === 0) {
            maze[i][cols - 1] = 0;
            exitX = i;
            exitY = cols - 1;
            break;
          }
        }
      } else if (side === "left") {
        for (let i = 1; i < rows - 1; i++) {
          if (maze[i][1] === 0) {
            maze[i][0] = 0;
            exitX = i;
            exitY = 0;
            break;
          }
        }
      } else if (side === "top") {
        for (let j = 1; j < cols - 1; j++) {
          if (maze[1][j] === 0) {
            maze[0][j] = 0;
            exitX = 0;
            exitY = j;
            break;
          }
        }
      } else if (side === "bottom") {
        for (let j = cols - 2; j >= 1; j--) {
          if (maze[rows - 2][j] === 0) {
            maze[rows - 1][j] = 0;
            exitX = rows - 1;
            exitY = j;
            break;
          }
        }
      }
  
      if (maze[exitX][exitY] === 0) {
        maze[exitX][exitY] = 2;
        finishX = exitX;
        finishY = exitY;
        exits.push({ exitX, exitY });
        usedSides.add(side);
      }
    }
  
    return {
      maze,
      exits,
      finishX,
      finishY,
      startX: centerRow,
      startY: centerCol
    };
  }
  function createRandomHoles(maze, count) {
  const rows = maze.length;
  const cols = maze[0].length;

  let added = 0;
  while (added < count) {
    const x = Math.floor(Math.random() * rows);
    const y = Math.floor(Math.random() * cols);

    if (maze[x][y] === 1 && x > 0 && x < rows - 1 && y > 0 && y < cols - 1) {
      maze[x][y] = 0;
      added++;
    }
  }
  return maze;
}

module.exports = { generateMaze, createRandomHoles }; 