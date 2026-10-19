
//describes one restaurant returned by the backend 
export interface RestaurantDTO {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  status: "OPEN" | "PAUSED" | "CLOSED";
}

//one dessert returned 

export interface MenuItemDTO {
  id: number;
  restaurantId: string;
  name: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  available: boolean;
  
}

export interface RestaurantReadRepository {
    //get all restaurants from the backend
  listRestaurants(): Promise<RestaurantDTO[]>;
  //get a specific restaurant by id from the backend
  findRestaurantById(id: string): Promise<RestaurantDTO | undefined>;
  //get all menu items for a specific restaurant by id from the backend
  findMenuByRestaurantId(id: string): Promise<MenuItemDTO[]>;
}
